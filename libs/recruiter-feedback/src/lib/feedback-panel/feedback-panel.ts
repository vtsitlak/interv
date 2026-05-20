import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { AuthFacade } from '@interv/state-auth';
import {
  InterviewService,
  type ChatMessage,
} from '@interv/state-interview';
import { InterviewTranscriptComponent } from '@interv/interview';
import {
  FEEDBACK_FIELD_LIMITS,
  RemainingCharsComponent,
  serializeFeedbackForm,
} from '@interv/shared';

interface FeedbackFormModel {
  score: number;
  text: string;
  requestContact: boolean;
}

@Component({
  selector: 'interv-interview-feedback-panel',
  standalone: true,
  imports: [FormField, InterviewTranscriptComponent, RemainingCharsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feedback-panel.html',
})
export class InterviewFeedbackPanelComponent {
  private readonly interviewService = inject(InterviewService);
  private readonly auth = inject(AuthFacade);

  readonly profileId = input.required<string>();
  readonly interviewId = input.required<string>();
  readonly embedded = input(false);
  readonly title = input('Your feedback');
  readonly description = input(
    'How well did the AI twin match what you were looking for? You can update this anytime.',
  );

  readonly feedbackSaved = output<{
    score: number;
    text: string;
    requestContact: boolean;
  }>();

  readonly feedbackModel = signal<FeedbackFormModel>({
    score: 8,
    text: '',
    requestContact: false,
  });
  private readonly savedSnapshot = signal<string | null>(null);
  readonly fieldLimits = FEEDBACK_FIELD_LIMITS;

  readonly isDirty = computed(() => {
    const saved = this.savedSnapshot();
    if (saved === null) {
      return false;
    }
    return serializeFeedbackForm(this.feedbackModel()) !== saved;
  });

  readonly feedbackForm = form(this.feedbackModel, (path) => {
    required(path.text, { message: 'Feedback is required' });
  });

  readonly recruiterEmail = computed(() => this.auth.user()?.email?.trim() ?? null);

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

  toggleRequestContact(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.feedbackModel.update((model) => ({
      ...model,
      requestContact: checked,
    }));
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const profileId = this.profileId();
    const interviewId = this.interviewId();
    if (!profileId || !interviewId || this.feedbackForm().invalid()) {
      return;
    }

    const { score, text, requestContact } = this.feedbackModel();
    const clampedScore = Math.min(10, Math.max(1, Math.round(score)));
    const email = this.recruiterEmail();

    if (requestContact && !email) {
      this.error.set(
        'Add an email to your account before sharing contact details with candidates.',
      );
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      await this.interviewService.submitFeedback(
        profileId,
        interviewId,
        clampedScore,
        text.trim(),
        {
          requestContact,
          recruiterEmail: requestContact ? email : null,
        },
      );
      this.hasExistingFeedback.set(true);
      this.feedbackSaved.emit({
        score: clampedScore,
        text: text.trim(),
        requestContact,
      });
      this.markSavedSnapshot();
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

  onTranscriptBackdropClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }
    this.closeTranscript();
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
          requestContact: review.requestContact,
        });
        this.hasExistingFeedback.set(true);
      } else {
        this.feedbackModel.set({ score: 8, text: '', requestContact: false });
        this.hasExistingFeedback.set(false);
      }
      this.markSavedSnapshot();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.isLoading.set(false);
    }
  }

  private markSavedSnapshot(): void {
    this.savedSnapshot.set(serializeFeedbackForm(this.feedbackModel()));
  }
}
