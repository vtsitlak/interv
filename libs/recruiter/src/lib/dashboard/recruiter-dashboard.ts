import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecruiterFacade, type RecruiterInterviewSummary } from '@interv/state-recruiter';

@Component({
  selector: 'lib-recruiter-dashboard',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recruiter-dashboard.html',
})
export class RecruiterDashboardComponent implements OnInit {
  readonly recruiter = inject(RecruiterFacade);

  ngOnInit(): void {
    void this.recruiter.loadInterviews();
  }

  selectInterview(interview: RecruiterInterviewSummary): void {
    void this.recruiter.selectInterview(interview);
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
}
