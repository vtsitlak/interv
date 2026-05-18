import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import type { InterviewSummary } from './dashboard.models';
import { DashboardStore } from './dashboard.store';

@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  private readonly store = inject(DashboardStore);
  private readonly auth = inject(Auth);

  readonly interviews = this.store.interviews;
  readonly selectedInterview = this.store.selectedInterview;
  readonly transcript = this.store.transcript;
  readonly isLoading = this.store.isLoading;
  readonly isLoadingTranscript = this.store.isLoadingTranscript;
  readonly error = this.store.error;
  readonly totalInterviews = this.store.totalInterviews;
  readonly completedInterviews = this.store.completedInterviews;
  readonly averageScore = this.store.averageScore;

  loadInterviews(): Promise<void> {
    return this.store.loadInterviews();
  }

  async selectInterview(interview: InterviewSummary): Promise<void> {
    this.store.setSelected(interview);
    const profileId = this.auth.currentUser?.uid;
    if (!profileId) {
      return;
    }
    await this.store.loadTranscript(profileId, interview.id);
  }

  closeDetail(): void {
    this.store.setSelected(null);
  }
}
