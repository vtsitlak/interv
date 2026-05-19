import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type {
  InterviewSummary,
  TranscriptMessage,
} from '@interv/state-dashboard';

@Component({
  selector: 'interv-interview-detail-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview-detail-modal.html',
})
export class InterviewDetailModalComponent {
  readonly interview = input.required<InterviewSummary>();
  readonly transcript = input<TranscriptMessage[]>([]);
  readonly isLoadingTranscript = input(false);
  readonly isRemoving = input(false);

  readonly closed = output<void>();
  readonly removeRequested = output<void>();

  close(): void {
    this.closed.emit();
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  formatDate(date: Date | null): string {
    if (!date) {
      return '';
    }
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  formatTime(date: Date | null): string {
    if (!date) {
      return '';
    }
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  scoreColor(score: number | null): string {
    if (score === null) {
      return 'badge-ghost';
    }
    if (score >= 8) {
      return 'badge-success';
    }
    if (score >= 5) {
      return 'badge-warning';
    }
    return 'badge-error';
  }

  roleLabel(
    role: 'user' | 'assistant',
    isPracticeSession: boolean,
  ): string {
    if (isPracticeSession) {
      return role === 'user' ? 'You' : 'AI twin';
    }
    return role === 'user' ? 'Recruiter' : 'AI twin';
  }

  requestRemove(): void {
    this.removeRequested.emit();
  }
}
