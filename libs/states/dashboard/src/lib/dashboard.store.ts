import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
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
  withComputed(({ interviews }) => ({
    totalInterviews: computed(() => interviews().length),
    completedInterviews: computed(() =>
      interviews().filter((i) => i.status === 'complete').length,
    ),
    averageScore: computed(() => {
      const scored = interviews().filter((i) => i.feedbackScore !== null);
      if (!scored.length) {
        return null;
      }
      const sum = scored.reduce(
        (acc, i) => acc + (i.feedbackScore ?? 0),
        0,
      );
      return Math.round((sum / scored.length) * 10) / 10;
    }),
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

      setTranscript(
        transcript: DashboardState['transcript'],
      ): void {
        patchState(store, { transcript, isLoadingTranscript: false });
      },

      setError(error: string): void {
        patchState(store, { error, isLoading: false, isLoadingTranscript: false });
      },

      async loadInterviews(): Promise<void> {
        patchState(store, { isLoading: true, error: null });
        try {
          const interviews = await dashboardService.getInterviews();
          patchState(store, { interviews, isLoading: false, error: null });
        } catch (e: unknown) {
          patchState(store, {
            error: errMessage(e),
            isLoading: false,
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
    };
  }),
);
