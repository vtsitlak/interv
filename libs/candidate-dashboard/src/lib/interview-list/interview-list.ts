import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type { InterviewSummary } from '@interv/state-dashboard';

@Component({
  selector: 'interv-interview-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview-list.html',
})
export class InterviewListComponent {
  readonly interviews = input<InterviewSummary[]>([]);

  readonly interviewSelect = output<InterviewSummary>();

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

  onSelect(interview: InterviewSummary): void {
    this.interviewSelect.emit(interview);
  }
}
