import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  isRecruiterProfileComplete,
  type CandidateSearchResult,
  type RecruiterInterviewSummary,
  type RecruiterInterviewStats,
  type RecruiterProfile,
  type RecruiterTranscriptMessage,
} from './recruiter.models';
import { RecruiterService } from './recruiter.service';
import type { RecruiterInfo } from '@interv/state-interview';

export interface RecruiterState {
  recruiterProfile: RecruiterProfile | null;
  profileLoading: boolean;
  profileSaving: boolean;
  profileError: string | null;
  searchQuery: string;
  searchResults: CandidateSearchResult[];
  searchLoading: boolean;
  hasMoreCandidates: boolean;
  isLoadingMoreCandidates: boolean;
  candidatesPageCursor: unknown | null;
  interviews: RecruiterInterviewSummary[];
  interviewsLoading: boolean;
  isLoadingMoreInterviews: boolean;
  hasMoreInterviews: boolean;
  interviewsPageCursor: unknown | null;
  interviewStats: RecruiterInterviewStats | null;
  selectedInterview: RecruiterInterviewSummary | null;
  transcript: RecruiterTranscriptMessage[];
  transcriptLoading: boolean;
  error: string | null;
}

const initialState: RecruiterState = {
  recruiterProfile: null,
  profileLoading: false,
  profileSaving: false,
  profileError: null,
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  hasMoreCandidates: false,
  isLoadingMoreCandidates: false,
  candidatesPageCursor: null,
  interviews: [],
  interviewsLoading: false,
  isLoadingMoreInterviews: false,
  hasMoreInterviews: false,
  interviewsPageCursor: null,
  interviewStats: null,
  selectedInterview: null,
  transcript: [],
  transcriptLoading: false,
  error: null,
};

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export const RecruiterStore = signalStore(
  { providedIn: 'root' },
  withState<RecruiterState>(initialState),
  withComputed((store) => {
    const service = inject(RecruiterService);
    return {
      isProfileComplete: computed(() =>
        isRecruiterProfileComplete(store.recruiterProfile()),
      ),
      interviewsByCandidateId: computed(() =>
        service.indexInterviewsByCandidate(store.interviews()),
      ),
      totalInterviews: computed(
        () => store.interviewStats()?.total ?? store.interviews().length,
      ),
      completedInterviews: computed(() => {
        const stats = store.interviewStats();
        if (stats) {
          return stats.completed;
        }
        return store.interviews().filter((i) => i.status === 'complete').length;
      }),
    };
  }),
  withMethods((store) => {
    const service = inject(RecruiterService);

    return {
      reset(): void {
        patchState(store, initialState);
      },

      setSearchQuery(query: string): void {
        patchState(store, { searchQuery: query });
      },

      async loadProfile(): Promise<void> {
        patchState(store, { profileLoading: true, profileError: null });
        try {
          const recruiterProfile = await service.getProfile();
          patchState(store, { recruiterProfile, profileLoading: false });
        } catch (e: unknown) {
          patchState(store, {
            profileLoading: false,
            profileError: errMessage(e),
          });
        }
      },

      async saveProfile(info: RecruiterInfo): Promise<boolean> {
        patchState(store, { profileSaving: true, profileError: null });
        try {
          const recruiterProfile = await service.saveProfile(info);
          patchState(store, { recruiterProfile, profileSaving: false });
          return true;
        } catch (e: unknown) {
          patchState(store, {
            profileSaving: false,
            profileError: errMessage(e),
          });
          return false;
        }
      },

      async searchCandidates(): Promise<void> {
        patchState(store, {
          searchLoading: true,
          isLoadingMoreCandidates: false,
          error: null,
          searchResults: [],
          candidatesPageCursor: null,
          hasMoreCandidates: false,
        });
        try {
          const interviews = await service.getInterviews();
          const page = await service.searchCandidatesPage(
            store.searchQuery(),
            undefined,
            null,
            interviews,
          );
          patchState(store, {
            interviews,
            searchResults: page.items,
            candidatesPageCursor: page.nextCursor,
            hasMoreCandidates: page.hasMore,
            searchLoading: false,
          });
        } catch (e: unknown) {
          patchState(store, { searchLoading: false, error: errMessage(e) });
        }
      },

      async loadMoreCandidates(): Promise<void> {
        if (
          !store.hasMoreCandidates() ||
          store.isLoadingMoreCandidates() ||
          store.searchLoading()
        ) {
          return;
        }

        patchState(store, { isLoadingMoreCandidates: true, error: null });
        try {
          const page = await service.searchCandidatesPage(
            store.searchQuery(),
            undefined,
            store.candidatesPageCursor() as QueryDocumentSnapshot | null,
            store.interviews(),
          );
          patchState(store, {
            searchResults: [...store.searchResults(), ...page.items],
            candidatesPageCursor: page.nextCursor,
            hasMoreCandidates: page.hasMore,
            isLoadingMoreCandidates: false,
          });
        } catch (e: unknown) {
          patchState(store, {
            isLoadingMoreCandidates: false,
            error: errMessage(e),
          });
        }
      },

      async refreshInterviewsAfterFeedback(
        interviewId: string,
      ): Promise<void> {
        try {
          const [freshInterviews, stats] = await Promise.all([
            service.getInterviews(),
            service.getInterviewStats(),
          ]);
          const byId = new Map(freshInterviews.map((i) => [i.id, i]));
          const selected = store.selectedInterview();
          const updatedSelected =
            selected?.id === interviewId
              ? (byId.get(interviewId) ?? selected)
              : selected;
          const searchResults = service.enrichCandidatesWithInterviews(
            store.searchResults().map((c) => ({
              ...c,
              latestInterview: null,
            })),
            freshInterviews,
          );
          patchState(store, {
            interviews: store.interviews().map(
              (interview) => byId.get(interview.id) ?? interview,
            ),
            interviewStats: stats,
            selectedInterview: updatedSelected,
            searchResults,
          });
        } catch (e: unknown) {
          patchState(store, { error: errMessage(e) });
        }
      },

      async loadInterviews(): Promise<void> {
        patchState(store, {
          interviewsLoading: true,
          isLoadingMoreInterviews: false,
          error: null,
          interviews: [],
          interviewsPageCursor: null,
          hasMoreInterviews: false,
        });
        try {
          const [page, stats] = await Promise.all([
            service.getInterviewsPage(),
            service.getInterviewStats(),
          ]);
          patchState(store, {
            interviews: page.items,
            interviewsPageCursor: page.nextCursor,
            hasMoreInterviews: page.hasMore,
            interviewStats: stats,
            interviewsLoading: false,
          });
        } catch (e: unknown) {
          patchState(store, {
            interviewsLoading: false,
            error: errMessage(e),
          });
        }
      },

      async loadMoreInterviews(): Promise<void> {
        if (
          !store.hasMoreInterviews() ||
          store.isLoadingMoreInterviews() ||
          store.interviewsLoading()
        ) {
          return;
        }

        patchState(store, { isLoadingMoreInterviews: true, error: null });
        try {
          const page = await service.getInterviewsPage(
            undefined,
            store.interviewsPageCursor() as QueryDocumentSnapshot | null,
          );
          patchState(store, {
            interviews: [...store.interviews(), ...page.items],
            interviewsPageCursor: page.nextCursor,
            hasMoreInterviews: page.hasMore,
            isLoadingMoreInterviews: false,
          });
        } catch (e: unknown) {
          patchState(store, {
            isLoadingMoreInterviews: false,
            error: errMessage(e),
          });
        }
      },

      async selectInterview(interview: RecruiterInterviewSummary): Promise<void> {
        patchState(store, {
          selectedInterview: interview,
          transcript: [],
          transcriptLoading: true,
        });
        try {
          const transcript = await service.getInterviewMessages(
            interview.candidateProfileId,
            interview.id,
          );
          patchState(store, { transcript, transcriptLoading: false });
        } catch (e: unknown) {
          patchState(store, {
            transcriptLoading: false,
            error: errMessage(e),
          });
        }
      },

      closeInterviewDetail(): void {
        patchState(store, {
          selectedInterview: null,
          transcript: [],
        });
      },

      async hideInterview(interview: RecruiterInterviewSummary): Promise<void> {
        try {
          await service.hideInterviewForRecruiter(
            interview.candidateProfileId,
            interview.id,
          );
          const stats = await service.getInterviewStats();
          const remainingInterviews = store
            .interviews()
            .filter((item) => item.id !== interview.id);
          const selected = store.selectedInterview();
          const searchResults = service.enrichCandidatesWithInterviews(
            store.searchResults().map((candidate) => ({
              ...candidate,
              latestInterview: null,
            })),
            remainingInterviews,
          );
          patchState(store, {
            interviews: remainingInterviews,
            interviewStats: stats,
            selectedInterview:
              selected?.id === interview.id ? null : selected,
            transcript: selected?.id === interview.id ? [] : store.transcript(),
            searchResults,
            error: null,
          });
        } catch (e: unknown) {
          patchState(store, { error: errMessage(e) });
        }
      },

      clearProfileError(): void {
        patchState(store, { profileError: null });
      },
    };
  }),
);
