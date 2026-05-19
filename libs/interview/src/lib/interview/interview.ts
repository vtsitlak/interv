import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthFacade } from '@interv/state-auth';
import {
  InterviewFacade,
  InterviewService,
  PRACTICE_RECRUITER_INFO,
  type RecruiterInfo,
} from '@interv/state-interview';
import { RecruiterFacade } from '@interv/state-recruiter';
import { InterviewSetupComponent } from '../interview-setup/interview-setup';
import { InterviewSuggestedQuestionsComponent } from '../interview-suggested-questions/interview-suggested-questions';

@Component({
  selector: 'interv-interview',
  standalone: true,
  imports: [InterviewSetupComponent, InterviewSuggestedQuestionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview.html',
  styleUrl: './interview.scss',
})
export class InterviewComponent implements OnInit, OnDestroy {
  readonly facade = inject(InterviewFacade);
  private readonly interviewService = inject(InterviewService);
  private readonly authFacade = inject(AuthFacade);
  private readonly recruiterFacade = inject(RecruiterFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly profileId = signal('');
  /** Hide recruiter setup form (practice or authenticated recruiter). */
  readonly skipSetup = signal(false);
  readonly isPracticeMode = signal(false);
  readonly isSetupComplete = signal(false);

  readonly chatText = signal('');
  readonly suggestedQuestions = signal<string[]>([]);
  readonly isLoadingSuggestedQuestions = signal(false);
  private readonly usedSuggestions = signal<Set<string>>(new Set());
  readonly usedSuggestionKeys = computed(() => [...this.usedSuggestions()]);

  ngOnInit(): void {
    this.facade.disconnect();

    const routeProfileId = this.route.snapshot.paramMap.get('profileId') ?? '';
    if (routeProfileId) {
      this.profileId.set(routeProfileId);
    }

    const testMode = this.routeDataFlag('testMode');
    const skipRecruiterSetup =
      this.routeDataFlag('skipRecruiterSetup') || this.authFacade.isRecruiter();

    this.isPracticeMode.set(testMode);
    this.skipSetup.set(testMode || skipRecruiterSetup);

    if (testMode) {
      const uid = this.authFacade.user()?.uid;
      if (uid) {
        this.profileId.set(uid);
      }
      void this.startPracticeInterview();
      return;
    }

    if (skipRecruiterSetup) {
      void this.startAuthenticatedRecruiterInterview();
    }
  }

  /** Walk the activated route tree (lazy routes nest `data` on parents). */
  private routeDataFlag(key: string): boolean {
    let route: ActivatedRoute | null = this.route;
    while (route) {
      if (route.snapshot.data[key] === true) {
        return true;
      }
      route = route.firstChild;
    }
    return false;
  }

  ngOnDestroy(): void {
    this.facade.disconnect();
  }

  async onSetupStart(info: RecruiterInfo): Promise<void> {
    if (!this.profileId()) {
      return;
    }
    this.usedSuggestions.set(new Set());
    this.suggestedQuestions.set([]);
    try {
      await this.facade.startInterview(this.profileId(), info);
      this.isSetupComplete.set(true);
      await this.loadSuggestedQuestionsWithRetry();
    } catch {
      // Error text is shown via facade.error() in template
    }
  }

  async sendMessage(): Promise<void> {
    const content = this.chatText().trim();
    if (!content || !this.facade.canSendMessage()) {
      return;
    }
    this.markMatchingSuggestionUsed(content);
    this.chatText.set('');
    await this.facade.sendMessage(content);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
    }
  }

  onRequestEnd(): void {
    this.facade.requestEndInterview();
  }

  onCancelEnd(): void {
    const wasAtLimit = this.facade.isComplete();
    this.facade.cancelEndInterview();
    if (wasAtLimit) {
      void this.reloadSuggestionsAfterContinue();
    }
  }

  onConfirmEnd(): void {
    void this.facade.confirmEndInterview({
      skipFeedback: this.isPracticeMode(),
    });
  }

  onSuggestionSelected(question: string): void {
    if (
      this.usedSuggestions().has(this.normalizeQuestion(question)) ||
      !this.facade.canSendMessage()
    ) {
      return;
    }
    this.chatText.set(question);
    void this.sendMessage();
  }

  private async startAuthenticatedRecruiterInterview(): Promise<void> {
    if (!this.profileId()) {
      return;
    }

    await this.recruiterFacade.loadProfile();
    const info = this.recruiterFacade.recruiterInfo();
    if (!info) {
      await this.router.navigate(['/recruiter/profile']);
      return;
    }

    const profileId = this.profileId();
    const recruiterUid = this.authFacade.user()?.uid;
    this.usedSuggestions.set(new Set());
    this.suggestedQuestions.set([]);

    try {
      await this.facade.startInterview(profileId, info, {
        recruiterUid,
        navigation: {
          feedbackPath: [
            '/recruiter/candidates',
            profileId,
            'feedback',
          ],
          skipFeedbackRedirect: ['/recruiter/dashboard'],
        },
      });
      this.isSetupComplete.set(true);
      await this.loadSuggestedQuestionsWithRetry();
    } catch {
      // Error text is shown via facade.error() in template
    }
  }

  private async startPracticeInterview(): Promise<void> {
    if (!this.profileId()) {
      return;
    }
    this.usedSuggestions.set(new Set());
    this.suggestedQuestions.set([]);
    try {
      await this.facade.startInterview(
        this.profileId(),
        PRACTICE_RECRUITER_INFO,
      );
      this.isSetupComplete.set(true);
      await this.loadSuggestedQuestionsWithRetry();
    } catch {
      // Error text is shown via facade.error() in template
    }
  }

  private normalizeQuestion(question: string): string {
    return question.trim().toLowerCase();
  }

  private markSuggestionUsed(question: string): void {
    const key = this.normalizeQuestion(question);
    if (!key) {
      return;
    }
    this.usedSuggestions.update((used) => {
      const next = new Set(used);
      next.add(key);
      return next;
    });
  }

  private markMatchingSuggestionUsed(content: string): void {
    const normalized = this.normalizeQuestion(content);
    for (const question of this.suggestedQuestions()) {
      if (this.normalizeQuestion(question) === normalized) {
        this.markSuggestionUsed(question);
        return;
      }
    }
  }

  private async loadSuggestedQuestionsWithRetry(): Promise<void> {
    await this.loadSuggestedQuestions();
    if (this.suggestedQuestions().length === 0) {
      await this.loadSuggestedQuestions();
    }
  }

  private async reloadSuggestionsAfterContinue(): Promise<void> {
    const hasUnused = this.suggestedQuestions().some(
      (q) => !this.usedSuggestions().has(this.normalizeQuestion(q)),
    );
    if (hasUnused) {
      return;
    }
    this.usedSuggestions.set(new Set());
    await this.loadSuggestedQuestionsWithRetry();
  }

  private async loadSuggestedQuestions(): Promise<void> {
    if (!this.profileId()) {
      return;
    }
    this.isLoadingSuggestedQuestions.set(true);
    try {
      const questions = await this.interviewService.getSuggestedQuestions(
        this.profileId(),
      );
      this.suggestedQuestions.set(questions);
    } finally {
      this.isLoadingSuggestedQuestions.set(false);
    }
  }
}
