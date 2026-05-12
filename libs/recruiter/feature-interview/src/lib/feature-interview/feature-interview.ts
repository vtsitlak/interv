import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import {
  InterviewFacade,
  type RecruiterInfo,
} from '@interv/state-interview';

interface RecruiterFormModel {
  name: string;
  role: string;
  company: string;
}

@Component({
  selector: 'lib-feature-interview',
  standalone: true,
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-interview.html',
  styleUrl: './feature-interview.scss',
})
export class FeatureInterview implements OnInit, OnDestroy {
  readonly facade = inject(InterviewFacade);
  private readonly route = inject(ActivatedRoute);

  readonly profileId =
    this.route.snapshot.paramMap.get('profileId') ?? '';

  readonly isSetupComplete = signal(false);

  readonly recruiterModel = signal<RecruiterFormModel>({
    name: '',
    role: '',
    company: '',
  });

  readonly recruiterForm = form(this.recruiterModel, (path) => {
    required(path.name, { message: 'Your name is required' });
    required(path.role, { message: 'Your role is required' });
    required(path.company, { message: 'Company is required' });
  });

  readonly chatText = signal('');

  ngOnInit(): void {
    this.facade.disconnect();
  }

  ngOnDestroy(): void {
    this.facade.disconnect();
  }

  async startInterview(): Promise<void> {
    if (this.recruiterForm().invalid() || !this.profileId) return;
    this.isSetupComplete.set(true);
    const { name, role, company } = this.recruiterModel();
    const info: RecruiterInfo = { name, role, company };
    await this.facade.startInterview(this.profileId, info);
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
