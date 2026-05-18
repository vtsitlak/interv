import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  isRecruiterProfileComplete,
  type CandidateSearchResult,
  type RecruiterInterviewSummary,
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
  interviews: RecruiterInterviewSummary[];
  interviewsLoading: boolean;
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
  interviews: [],
  interviewsLoading: false,
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
  withComputed(({ recruiterProfile, interviews }) => ({
    isProfileComplete: computed(() =>
      isRecruiterProfileComplete(recruiterProfile()),
    ),
    totalInterviews: computed(() => interviews().length),
    completedInterviews: computed(
      () => interviews().filter((i) => i.status === 'complete').length,
    ),
    averageScore: computed(() => {
      const scored = interviews()
        .map((i) => i.feedbackScore)
        .filter((s): s is number => s !== null);
      if (!scored.length) {
        return null;
      }
      const sum = scored.reduce((a, b) => a + b, 0);
      return Math.round((sum / scored.length) * 10) / 10;
    }),
  })),
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
        patchState(store, { searchLoading: true, error: null });
        try {
          const results = await service.searchPublishedCandidates(
            store.searchQuery(),
          );
          patchState(store, { searchResults: results, searchLoading: false });
        } catch (e: unknown) {
          patchState(store, { searchLoading: false, error: errMessage(e) });
        }
      },

      async loadInterviews(): Promise<void> {
        patchState(store, { interviewsLoading: true, error: null });
        try {
          const interviews = await service.getInterviews();
          patchState(store, { interviews, interviewsLoading: false });
        } catch (e: unknown) {
          patchState(store, {
            interviewsLoading: false,
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

      clearProfileError(): void {
        patchState(store, { profileError: null });
      },
    };
  }),
);
