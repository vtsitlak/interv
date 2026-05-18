import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '@interv/state-auth';
import { DashboardFacade, type InterviewSummary } from '@interv/state-dashboard';
import { ProfileFacade } from '@interv/state-profile';

@Component({
  selector: 'lib-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthFacade);

  readonly dashboard = inject(DashboardFacade);
  readonly profile = inject(ProfileFacade);

  readonly copySuccess = signal(false);

  ngOnInit(): void {
    void this.dashboard.loadInterviews();
    void this.profile.loadProfile();
  }

  selectInterview(interview: InterviewSummary): void {
    void this.dashboard.selectInterview(interview);
  }

  closeDetail(): void {
    this.dashboard.closeDetail();
  }

  editProfile(): void {
    void this.router.navigate(['/profile']);
  }

  async copyShareLink(): Promise<void> {
    const sharePath = this.profile.shareUrl();
    const uid = this.auth.user()?.uid;
    const path = sharePath ?? (uid ? `/candidate/${uid}` : null);
    if (!path) {
      return;
    }
    const url = `${globalThis.location.origin}${path}/interview`;
    try {
      await navigator.clipboard.writeText(url);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  formatTime(date: Date | null): string {
    if (!date) {
      return '';
    }
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  scoreColor(score: number | null): string {
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

  roleLabel(
    role: 'user' | 'assistant',
    isPracticeSession: boolean,
  ): string {
    if (isPracticeSession) {
      return role === 'user' ? 'You' : 'AI twin';
    }
    return role === 'user' ? 'Recruiter' : 'AI twin';
  }
}
