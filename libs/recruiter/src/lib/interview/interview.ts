import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  InterviewFacade,
  type RecruiterInfo,
} from '@interv/state-interview';
import { InterviewSetupComponent } from '../interview-setup/interview-setup';

@Component({
  selector: 'lib-interview',
  standalone: true,
  imports: [InterviewSetupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview.html',
  styleUrl: './interview.scss',
})
export class InterviewComponent implements OnInit, OnDestroy {
  readonly facade = inject(InterviewFacade);
  private readonly route = inject(ActivatedRoute);

  readonly profileId =
    this.route.snapshot.paramMap.get('profileId') ?? '';

  readonly isSetupComplete = signal(false);

  readonly chatText = signal('');

  ngOnInit(): void {
    this.facade.disconnect();
  }

  ngOnDestroy(): void {
    this.facade.disconnect();
  }

  async onSetupStart(info: RecruiterInfo): Promise<void> {
    if (!this.profileId) return;
    try {
      await this.facade.startInterview(this.profileId, info);
      this.isSetupComplete.set(true);
    } catch {
      // Error text is shown via facade.error() in template
    }
  }

  async sendMessage(): Promise<void> {
    const content = this.chatText().trim();
    if (!content || !this.facade.canSendMessage()) return;
    this.chatText.set('');
    await this.facade.sendMessage(content);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
    }
  }
}
