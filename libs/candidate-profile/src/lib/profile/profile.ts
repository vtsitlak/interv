import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  buildProfileOverview,
  formatWorkPreferenceLabel,
  normalizeWorkPreferences,
  type Profile as ProfileModel,
  type WorkPreference,
} from '@interv/models';
import { ProfileService } from '@interv/state-profile';
import {
  InterviewService,
  type InterviewReview,
} from '@interv/state-interview';

@Component({
  selector: 'lib-profile',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly interviewService = inject(InterviewService);
  private readonly profileService = inject(ProfileService);

  readonly profileId = signal('');
  readonly isOwnerView = signal(false);
  readonly recruiterView = signal(false);
  readonly profile = signal<ProfileModel | null>(null);
  readonly reviewableInterview = signal<InterviewReview | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly photoLoadFailed = signal(false);

  ngOnInit(): void {
    this.isOwnerView.set(this.route.snapshot.data['ownerMode'] === true);
    this.recruiterView.set(this.route.snapshot.data['recruiterView'] === true);
    const routeProfileId = this.route.snapshot.paramMap.get('profileId') ?? '';
    if (routeProfileId) {
      this.profileId.set(routeProfileId);
    }
    void this.load();
  }

  hasProfilePhoto(photo: string | undefined): boolean {
    return !!photo?.trim() && !this.photoLoadFailed();
  }

  profileInitial(name: string): string {
    const initial = name.trim().charAt(0);
    return initial ? initial.toUpperCase() : '?';
  }

  onPhotoError(): void {
    this.photoLoadFailed.set(true);
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

    const queryInterviewId =
      this.route.snapshot.queryParamMap.get('interviewId') ?? '';

    try {
      const p = await this.interviewService.getPublicProfile(profileId);
      if (!p) {
        this.error.set(
          this.isOwnerView()
            ? 'Save and train your profile first.'
            : 'This profile is not available yet.',
        );
      } else {
        this.photoLoadFailed.set(false);
        this.profile.set(p);

        if (!this.isOwnerView()) {
          let review: InterviewReview | null = null;
          if (queryInterviewId) {
            const byId = await this.interviewService.getInterviewForReview(
              profileId,
              queryInterviewId,
            );
            if (
              byId &&
              byId.feedbackScore !== null &&
              byId.feedbackText
            ) {
              review = byId;
            }
          }
          if (!review) {
            review = await this.interviewService.getLatestInterviewWithFeedback(
              profileId,
            );
          }
          this.reviewableInterview.set(review);
        }
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.isLoading.set(false);
    }
  }
}
