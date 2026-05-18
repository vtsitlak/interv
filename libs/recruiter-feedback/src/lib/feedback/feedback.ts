import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import {
  InterviewService,
  type ChatMessage,
} from '@interv/state-interview';
import { InterviewTranscriptComponent } from '@interv/interview';

interface FeedbackFormModel {
  score: number;
  text: string;
}

@Component({
  selector: 'lib-feedback',
  standalone: true,
  imports: [FormField, InterviewTranscriptComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feedback.html',
  styleUrl: './feedback.scss',
})
export class FeedbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly interviewService = inject(InterviewService);

  readonly profileId =
    this.route.snapshot.paramMap.get('profileId') ?? '';
  readonly interviewId =
    this.route.snapshot.queryParamMap.get('interviewId') ?? '';

  readonly feedbackModel = signal<FeedbackFormModel>({ score: 8, text: '' });

  readonly feedbackForm = form(this.feedbackModel, (path) => {
    required(path.text, { message: 'Feedback is required' });
  });

  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly showTranscript = signal(false);
  readonly transcript = signal<ChatMessage[]>([]);
  readonly isLoadingTranscript = signal(false);

  ngOnInit(): void {
    if (!this.profileId || !this.interviewId) {
      this.error.set('Missing interview. Start an interview and try again.');
    }
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    if (!this.profileId || !this.interviewId) {
      return;
    }
    if (this.feedbackForm().invalid()) {
      return;
    }

    const { score, text } = this.feedbackModel();
    const clampedScore = Math.min(10, Math.max(1, Math.round(score)));
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      await this.interviewService.submitFeedback(
        this.profileId,
        this.interviewId,
        clampedScore,
        text.trim(),
      );
      this.submitted.set(true);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goHome(): void {
    void this.router.navigate(['/candidate', this.profileId], {
      queryParams: { interviewId: this.interviewId },
    });
  }

  async openTranscript(): Promise<void> {
    if (!this.profileId || !this.interviewId) {
      return;
    }
    this.showTranscript.set(true);
    this.isLoadingTranscript.set(true);
    try {
      const messages = await this.interviewService.getInterviewMessages(
        this.profileId,
        this.interviewId,
      );
      this.transcript.set(messages);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : String(e));
      this.showTranscript.set(false);
    } finally {
      this.isLoadingTranscript.set(false);
    }
  }

  closeTranscript(): void {
    this.showTranscript.set(false);
  }
}
