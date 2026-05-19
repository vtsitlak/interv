import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  InterviewService,
  type ChatMessage,
  type InterviewReview,
} from '@interv/state-interview';
import { InterviewTranscriptComponent } from '../interview-transcript/interview-transcript';

interface FeedbackFormModel {
  score: number;
  text: string;
}

@Component({
  selector: 'interv-interview-summary',
  standalone: true,
  imports: [FormField, RouterLink, InterviewTranscriptComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview-summary.html',
  styleUrl: './interview-summary.scss',
})
export class InterviewSummaryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly interviewService = inject(InterviewService);

  readonly profileId =
    this.route.snapshot.paramMap.get('profileId') ?? '';
  readonly interviewId =
    this.route.snapshot.paramMap.get('interviewId') ?? '';

  readonly candidateName = signal('');
  readonly interview = signal<InterviewReview | null>(null);
  readonly transcript = signal<ChatMessage[]>([]);
  readonly isLoading = signal(true);
  readonly isLoadingTranscript = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  readonly feedbackModel = signal<FeedbackFormModel>({ score: 8, text: '' });

  readonly feedbackForm = form(this.feedbackModel, (path) => {
    required(path.text, { message: 'Feedback is required' });
  });

  ngOnInit(): void {
    void this.load();
  }

  scoreBadgeClass(score: number | null): string {
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

  formatDate(date: Date | null): string {
    if (!date) {
      return '';
    }
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  async onSaveFeedback(event?: Event): Promise<void> {
    event?.preventDefault();
    if (!this.profileId || !this.interviewId || this.feedbackForm().invalid()) {
      return;
    }

    const { score, text } = this.feedbackModel();
    const clampedScore = Math.min(10, Math.max(1, Math.round(score)));
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.error.set(null);

    try {
      await this.interviewService.submitFeedback(
        this.profileId,
        this.interviewId,
        clampedScore,
        text.trim(),
      );
      this.interview.update((current) =>
        current
          ? {
              ...current,
              feedbackScore: clampedScore,
              feedbackText: text.trim(),
            }
          : current,
      );
      this.saveSuccess.set(true);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.isSaving.set(false);
    }
  }

  private async load(): Promise<void> {
    if (!this.profileId || !this.interviewId) {
      this.error.set('Interview not found.');
      this.isLoading.set(false);
      return;
    }

    try {
      const [profile, review] = await Promise.all([
        this.interviewService.getPublicProfile(this.profileId),
        this.interviewService.getInterviewForReview(
          this.profileId,
          this.interviewId,
        ),
      ]);

      this.candidateName.set(profile?.name?.trim() ?? 'Candidate');

      if (!review) {
        this.error.set('This interview could not be found.');
        return;
      }

      this.interview.set(review);
      this.feedbackModel.set({
        score: review.feedbackScore ?? 8,
        text: review.feedbackText ?? '',
      });

      this.isLoadingTranscript.set(true);
      const messages = await this.interviewService.getInterviewMessages(
        this.profileId,
        this.interviewId,
      );
      this.transcript.set(messages);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.isLoading.set(false);
      this.isLoadingTranscript.set(false);
    }
  }
}
