import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import type { RecruiterInfo } from '@interv/state-interview';

interface RecruiterFormModel {
  name: string;
  role: string;
  company: string;
}

@Component({
  selector: 'interv-interview-setup',
  standalone: true,
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview-setup.html',
  styleUrl: './interview-setup.scss',
})
export class InterviewSetupComponent {
  readonly profileId = input.required<string>();

  readonly error = input<string | null>(null);

  readonly isConnecting = input(false);

  readonly startInterview = output<RecruiterInfo>();

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

  onStartClick(): void {
    if (this.recruiterForm().invalid() || !this.profileId().trim()) {
      return;
    }
    const { name, role, company } = this.recruiterModel();
    this.startInterview.emit({ name, role, company });
  }
}
