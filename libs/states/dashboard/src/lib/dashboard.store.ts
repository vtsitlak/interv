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
  errMessage,
  INITIAL_DASHBOARD_STATE,
  type DashboardState,
  type InterviewSummary,
} from './dashboard.models';
import { DashboardService } from './dashboard.service';

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState<DashboardState>(INITIAL_DASHBOARD_STATE),
  withComputed(({ interviews, interviewStats }) => ({
    totalInterviews: computed(
      () => interviewStats()?.total ?? interviews().length,
    ),
    completedInterviews: computed(() => {
      const stats = interviewStats();
      if (stats) {
        return stats.completed;
      }
      return interviews().filter((i) => i.status === 'complete').length;
    }),
    averageScore: computed(() => interviewStats()?.averageScore ?? null),
  })),
  withMethods((store) => {
    const dashboardService = inject(DashboardService);

    return {
      setLoading(isLoading: boolean): void {
        patchState(store, { isLoading, error: isLoading ? null : store.error() });
      },

      setInterviews(interviews: InterviewSummary[]): void {
        patchState(store, { interviews, isLoading: false, error: null });
      },

      setSelected(interview: InterviewSummary | null): void {
        patchState(store, {
          selectedInterview: interview,
          transcript: [],
          isLoadingTranscript: false,
        });
      },

      setTranscriptLoading(isLoadingTranscript: boolean): void {
        patchState(store, { isLoadingTranscript });
      },

      setTranscript(transcript: DashboardState['transcript']): void {
        patchState(store, { transcript, isLoadingTranscript: false });
      },

      setError(error: string): void {
        patchState(store, { error, isLoading: false, isLoadingTranscript: false });
      },

      async loadInterviews(): Promise<void> {
        patchState(store, {
          isLoading: true,
          isLoadingMoreInterviews: false,
          error: null,
          interviews: [],
          interviewsPageCursor: null,
          hasMoreInterviews: false,
        });
        try {
          const [page, stats] = await Promise.all([
            dashboardService.getInterviewsPage(),
            dashboardService.getInterviewStats(),
          ]);
          patchState(store, {
            interviews: page.items,
            interviewsPageCursor: page.nextCursor,
            hasMoreInterviews: page.hasMore,
            interviewStats: stats,
            isLoading: false,
            error: null,
          });
        } catch (e: unknown) {
          patchState(store, {
            error: errMessage(e),
            isLoading: false,
          });
        }
      },

      async loadMoreInterviews(): Promise<void> {
        if (
          !store.hasMoreInterviews() ||
          store.isLoadingMoreInterviews() ||
          store.isLoading()
        ) {
          return;
        }

        patchState(store, { isLoadingMoreInterviews: true, error: null });
        try {
          const page = await dashboardService.getInterviewsPage(
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
            error: errMessage(e),
            isLoadingMoreInterviews: false,
          });
        }
      },

      async loadTranscript(
        profileId: string,
        interviewId: string,
      ): Promise<void> {
        patchState(store, { isLoadingTranscript: true });
        try {
          const transcript = await dashboardService.getInterviewMessages(
            profileId,
            interviewId,
          );
          patchState(store, { transcript, isLoadingTranscript: false });
        } catch (e: unknown) {
          patchState(store, {
            error: errMessage(e),
            isLoadingTranscript: false,
            transcript: [],
          });
        }
      },

      async hideInterview(interviewId: string): Promise<void> {
        try {
          await dashboardService.hideInterviewForCandidate(interviewId);
          const stats = await dashboardService.getInterviewStats();
          const selected = store.selectedInterview();
          patchState(store, {
            interviews: store.interviews().filter((i) => i.id !== interviewId),
            interviewStats: stats,
            selectedInterview: selected?.id === interviewId ? null : selected,
            transcript: selected?.id === interviewId ? [] : store.transcript(),
            error: null,
          });
        } catch (e: unknown) {
          patchState(store, { error: errMessage(e) });
        }
      },
    };
  }),
);
