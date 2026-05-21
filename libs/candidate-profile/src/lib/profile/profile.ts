import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  buildProfileOverview,
  formatWorkPreferenceLabel,
  isProfileComplete,
  normalizeWorkPreferences,
  ProfilePhotoComponent,
  PROFILE_TWIN_INCOMPLETE_MESSAGE,
  type Profile as ProfileModel,
  type WorkPreference,
} from '@interv/shared';
import { ProfileService } from '@interv/state-profile';
import { InterviewService } from '@interv/state-interview';
import { RecruiterFacade } from '@interv/state-recruiter';

@Component({
  selector: 'interv-profile',
  standalone: true,
  imports: [RouterLink, ProfilePhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly interviewService = inject(InterviewService);
  private readonly profileService = inject(ProfileService);
  readonly recruiterFacade = inject(RecruiterFacade);

  readonly profileId = signal('');
  readonly isOwnerView = signal(false);
  readonly recruiterView = signal(false);
  readonly isPublicView = signal(false);
  readonly profile = signal<ProfileModel | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly publicProfileDisabled = signal(false);

  readonly profileTwinIncompleteMessage = PROFILE_TWIN_INCOMPLETE_MESSAGE;
  readonly canTestInterview = computed(() => isProfileComplete(this.profile()));

  ngOnInit(): void {
    this.isOwnerView.set(this.route.snapshot.data['ownerMode'] === true);
    this.recruiterView.set(this.route.snapshot.data['recruiterView'] === true);
    this.isPublicView.set(
      !this.isOwnerView() && !this.recruiterView(),
    );
    const routeProfileId = this.route.snapshot.paramMap.get('profileId') ?? '';
    if (routeProfileId) {
      this.profileId.set(routeProfileId);
    }
    void this.load();
  }

  linkedInUrl(): string | null {
    const url = this.profile()?.linkedIn?.trim();
    return url || null;
  }

  skills(): string[] {
    return this.profile()?.skills ?? [];
  }

  workPreferences(): WorkPreference[] {
    return normalizeWorkPreferences(this.profile()?.workPreferences);
  }

  workPreferenceLabel(id: WorkPreference): string {
    return formatWorkPreferenceLabel(id);
  }

  /** Paragraph under the role and in Profile overview (AI-generated after train). */
  careerSummary(): string {
    const p = this.profile();
    if (!p) {
      return '';
    }
    const generated = p.careerOverview?.trim();
    if (generated) {
      return generated;
    }
    return p.summary?.trim() ?? '';
  }

  profileOverview(): string {
    const p = this.profile();
    if (!p) {
      return '';
    }
    return buildProfileOverview(p);
  }

  private async load(): Promise<void> {
    let profileId = this.profileId();

    if (this.isOwnerView()) {
      const user = await this.profileService.currentUserOrNull();
      if (!user) {
        this.error.set('Sign in to view your profile.');
        this.isLoading.set(false);
        return;
      }
      profileId = user.uid;
      this.profileId.set(profileId);
    }

    if (!profileId) {
      this.error.set('Profile not found.');
      this.isLoading.set(false);
      return;
    }

    try {
      if (this.recruiterView()) {
        await this.recruiterFacade.loadInterviews();
      }

      const p = await this.interviewService.getPublicProfile(profileId);
      if (!p) {
        this.error.set(
          this.isOwnerView()
            ? 'Save and train your profile first.'
            : 'This profile is not available yet.',
        );
      } else if (
        this.isPublicView() &&
        p.isPublicProfileEnabled === false
      ) {
        this.publicProfileDisabled.set(true);
      } else {
        this.profile.set(p);
      }
    } catch (e: unknown) {
      if (this.isPublicView() && this.isAccessDenied(e)) {
        this.publicProfileDisabled.set(true);
      } else {
        this.error.set(e instanceof Error ? e.message : String(e));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private isAccessDenied(e: unknown): boolean {
    if (e !== null && typeof e === 'object' && 'code' in e) {
      return (e as { code: string }).code === 'permission-denied';
    }
    return false;
  }
}
