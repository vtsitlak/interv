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
import { InterviewDetailModalComponent } from '../interview-detail-modal/interview-detail-modal';
import { InterviewListComponent } from '../interview-list/interview-list';
import { ProfileVisibilitySettingsComponent } from '../profile-visibility-settings/profile-visibility-settings';

@Component({
  selector: 'interv-dashboard',
  standalone: true,
  imports: [
    ProfileVisibilitySettingsComponent,
    InterviewListComponent,
    InterviewDetailModalComponent,
  ],
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
    void this.router.navigate(['/candidate/train-profile']);
  }

  onPublicProfileEnabledChange(enabled: boolean): void {
    void this.profile.setPublicProfileEnabled(enabled);
  }

  onDiscoverableByRecruitersChange(discoverable: boolean): void {
    void this.profile.setProfileDiscoverability(discoverable);
  }

  async copyPublicProfileLink(): Promise<void> {
    const sharePath = this.profile.shareUrl();
    const uid = this.auth.user()?.uid;
    const path = sharePath ?? (uid ? `/candidate/${uid}` : null);
    if (!path) {
      return;
    }
    const url = `${globalThis.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }
}
