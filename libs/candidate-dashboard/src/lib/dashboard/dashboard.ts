import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmModalComponent } from '@interv/shared';
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
    ConfirmModalComponent,
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
  readonly isRemovingInterview = signal(false);
  readonly showRemoveConfirm = signal(false);

  readonly removeConfirmMessage =
    'The interview data is kept, but it will no longer appear in your list or match score totals.';

  ngOnInit(): void {
    void this.dashboard.loadInterviews();
    void this.profile.loadProfile();
  }

  selectInterview(interview: InterviewSummary): void {
    void this.dashboard.selectInterview(interview);
  }

  loadMoreInterviews(): void {
    void this.dashboard.loadMoreInterviews();
  }

  closeDetail(): void {
    this.dashboard.closeDetail();
  }

  openRemoveConfirm(): void {
    if (this.dashboard.selectedInterview() && !this.isRemovingInterview()) {
      this.showRemoveConfirm.set(true);
    }
  }

  cancelRemoveConfirm(): void {
    this.showRemoveConfirm.set(false);
  }

  async confirmRemoveInterview(): Promise<void> {
    const interview = this.dashboard.selectedInterview();
    if (!interview || this.isRemovingInterview()) {
      return;
    }
    this.isRemovingInterview.set(true);
    try {
      await this.dashboard.hideInterview(interview.id);
      this.showRemoveConfirm.set(false);
    } finally {
      this.isRemovingInterview.set(false);
    }
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
