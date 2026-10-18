import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private readonly router = inject(Router);
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
  readonly publicDisplayName = computed(() => {
    const p = this.profile();
    if (!p) {
      return '';
    }
    if (this.isOwnerView() || this.recruiterView()) {
      return p.name;
    }
    if (p.showFullNameOnPublicProfile === false && p.username) {
      return `@${p.username}`;
    }
    return p.name;
  });

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

  profileOverview(): string {
    const p = this.profile();
    if (!p) {
      return '';
    }
    return buildProfileOverview(p);
  }

  private async load(): Promise<void> {
    if (this.isOwnerView()) {
      const user = await this.profileService.currentUserOrNull();
      if (!user) {
        this.error.set('Sign in to view your profile.');
        this.isLoading.set(false);
        return;
      }
      this.profileId.set(user.uid);
      try {
        const p = await this.profileService.getProfile(user.uid);
        if (!p) {
          this.error.set('Save and train your profile first.');
        } else {
          this.profile.set(p);
        }
      } catch (e: unknown) {
        this.error.set(e instanceof Error ? e.message : String(e));
      } finally {
        this.isLoading.set(false);
      }
      return;
    }

    const handle = this.profileId();
    if (!handle) {
      this.error.set('Profile not found.');
      this.isLoading.set(false);
      return;
    }

    try {
      if (this.recruiterView()) {
        await this.recruiterFacade.loadInterviews();
      }

      const resolved = await this.profileService.resolvePublicProfile(handle);
      if (!resolved) {
        this.error.set('This profile is not available yet.');
        return;
      }

      this.profileId.set(resolved.uid);

      if (
        this.isPublicView() &&
        resolved.shouldRedirectToUsername &&
        resolved.canonicalUsername
      ) {
        const childPath = this.route.snapshot.url
          .slice(1)
          .map((s) => s.path);
        await this.router.navigate(
          ['/candidate', resolved.canonicalUsername, ...childPath],
          { replaceUrl: true, queryParamsHandling: 'preserve' },
        );
        return;
      }

      if (
        this.isPublicView() &&
        resolved.profile.isPublicProfileEnabled === false
      ) {
        this.publicProfileDisabled.set(true);
      } else {
        this.profile.set(resolved.profile);
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
