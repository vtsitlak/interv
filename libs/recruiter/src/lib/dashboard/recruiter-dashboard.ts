import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmModalComponent, InfiniteScrollDirective } from '@interv/shared';
import { RecruiterFacade, type RecruiterInterviewSummary } from '@interv/state-recruiter';
import { InterviewFeedbackPanelComponent } from '@interv/recruiter-feedback';

@Component({
  selector: 'interv-recruiter-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    InterviewFeedbackPanelComponent,
    InfiniteScrollDirective,
    ConfirmModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recruiter-dashboard.html',
})
export class RecruiterDashboardComponent implements OnInit {
  readonly recruiter = inject(RecruiterFacade);

  readonly showRemoveConfirm = signal(false);
  readonly isRemovingInterview = signal(false);

  readonly removeConfirmMessage =
    'The interview data is kept, but it will no longer appear in your list or totals.';

  ngOnInit(): void {
    void this.recruiter.loadInterviews();
  }

  selectInterview(interview: RecruiterInterviewSummary): void {
    void this.recruiter.selectInterview(interview);
  }

  loadMoreInterviews(): void {
    void this.recruiter.loadMoreInterviews();
  }

  closeDetail(): void {
    this.recruiter.closeInterviewDetail();
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  onFeedbackSaved(interviewId: string): void {
    void this.recruiter.refreshInterviewsAfterFeedback(interviewId);
  }

  openRemoveConfirm(): void {
    if (this.recruiter.selectedInterview() && !this.isRemovingInterview()) {
      this.showRemoveConfirm.set(true);
    }
  }

  cancelRemoveConfirm(): void {
    this.showRemoveConfirm.set(false);
  }

  async confirmRemoveInterview(): Promise<void> {
    const interview = this.recruiter.selectedInterview();
    if (!interview || this.isRemovingInterview()) {
      return;
    }
    this.isRemovingInterview.set(true);
    try {
      await this.recruiter.hideInterview(interview);
      this.showRemoveConfirm.set(false);
    } finally {
      this.isRemovingInterview.set(false);
    }
  }
}
