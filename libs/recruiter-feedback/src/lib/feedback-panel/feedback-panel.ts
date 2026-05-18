import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
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
  selector: 'lib-interview-feedback-panel',
  standalone: true,
  imports: [FormField, InterviewTranscriptComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feedback-panel.html',
})
export class InterviewFeedbackPanelComponent {
  private readonly interviewService = inject(InterviewService);

  readonly profileId = input.required<string>();
  readonly interviewId = input.required<string>();
  readonly embedded = input(false);
  readonly title = input('Your feedback');
  readonly description = input(
    'Rate how the AI twin represented the candidate. You can update this anytime.',
  );

  readonly feedbackSaved = output<{ score: number; text: string }>();

  readonly feedbackModel = signal<FeedbackFormModel>({ score: 8, text: '' });

  readonly feedbackForm = form(this.feedbackModel, (path) => {
    required(path.text, { message: 'Feedback is required' });
  });

  readonly isSubmitting = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasExistingFeedback = signal(false);
  readonly showTranscript = signal(false);
  readonly transcript = signal<ChatMessage[]>([]);
  readonly isLoadingTranscript = signal(false);

  readonly submitLabel = () =>
    this.hasExistingFeedback() ? 'Update feedback' : 'Submit feedback';

  constructor() {
    effect(() => {
      const profileId = this.profileId();
      const interviewId = this.interviewId();
      if (profileId && interviewId) {
        void this.loadExisting(profileId, interviewId);
      }
    });
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    const profileId = this.profileId();
    const interviewId = this.interviewId();
    if (!profileId || !interviewId || this.feedbackForm().invalid()) {
      return;
    }

    const { score, text } = this.feedbackModel();
    const clampedScore = Math.min(10, Math.max(1, Math.round(score)));
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      await this.interviewService.submitFeedback(
        profileId,
        interviewId,
        clampedScore,
        text.trim(),
      );
      this.hasExistingFeedback.set(true);
      this.feedbackSaved.emit({ score: clampedScore, text: text.trim() });
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async openTranscript(): Promise<void> {
    const profileId = this.profileId();
    const interviewId = this.interviewId();
    if (!profileId || !interviewId) {
      return;
    }
    this.showTranscript.set(true);
    this.isLoadingTranscript.set(true);
    try {
      const messages = await this.interviewService.getInterviewMessages(
        profileId,
        interviewId,
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

  private async loadExisting(
    profileId: string,
    interviewId: string,
  ): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const review = await this.interviewService.getInterviewForReview(
        profileId,
        interviewId,
      );
      if (
        review &&
        review.feedbackScore !== null &&
        review.feedbackText
      ) {
        this.feedbackModel.set({
          score: review.feedbackScore,
          text: review.feedbackText,
        });
        this.hasExistingFeedback.set(true);
      } else {
        this.feedbackModel.set({ score: 8, text: '' });
        this.hasExistingFeedback.set(false);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.isLoading.set(false);
    }
  }
}
