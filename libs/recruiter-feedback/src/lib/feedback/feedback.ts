import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InterviewFeedbackPanelComponent } from '../feedback-panel/feedback-panel';

@Component({
  selector: 'lib-feedback',
  standalone: true,
  imports: [InterviewFeedbackPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feedback.html',
  styleUrl: './feedback.scss',
})
export class FeedbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly profileId =
    this.route.snapshot.paramMap.get('profileId') ?? '';
  readonly interviewId =
    this.route.snapshot.queryParamMap.get('interviewId') ?? '';
  readonly isRecruiterFlow =
    this.route.snapshot.data['recruiterFeedback'] === true;

  readonly error = signal<string | null>(null);
  readonly saved = signal(false);
  readonly savedScore = signal<number | null>(null);

  ngOnInit(): void {
    if (!this.profileId || !this.interviewId) {
      this.error.set('Missing interview. Start an interview and try again.');
    }
  }

  onFeedbackSaved(event: { score: number; text: string }): void {
    this.savedScore.set(event.score);
    this.saved.set(true);
  }

  goHome(): void {
    if (this.isRecruiterFlow) {
      void this.router.navigate(['/recruiter/candidates', this.profileId]);
      return;
    }
    void this.router.navigate(['/candidate', this.profileId], {
      queryParams: { interviewId: this.interviewId },
    });
  }

  goDashboard(): void {
    void this.router.navigate(['/recruiter/dashboard']);
  }
}
