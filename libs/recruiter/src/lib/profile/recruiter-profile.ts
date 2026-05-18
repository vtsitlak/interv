import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { Router } from '@angular/router';
import type { RecruiterInfo } from '@interv/state-interview';
import { RecruiterFacade } from '@interv/state-recruiter';

interface RecruiterFormModel {
  name: string;
  role: string;
  company: string;
}

@Component({
  selector: 'lib-recruiter-profile',
  standalone: true,
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recruiter-profile.html',
})
export class RecruiterProfileComponent implements OnInit {
  private readonly router = inject(Router);
  readonly recruiter = inject(RecruiterFacade);

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

  ngOnInit(): void {
    void this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    await this.recruiter.loadProfile();
    const profile = this.recruiter.profile();
    if (profile) {
      this.recruiterModel.set({
        name: profile.name,
        role: profile.role,
        company: profile.company,
      });
    }
  }

  async onSave(): Promise<void> {
    if (this.recruiterForm().invalid()) {
      return;
    }
    const info: RecruiterInfo = this.recruiterModel();
    const saved = await this.recruiter.saveProfile(info);
    if (saved) {
      await this.router.navigate(['/recruiter/dashboard']);
    }
  }
}
