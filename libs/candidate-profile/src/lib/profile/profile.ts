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
import { InterviewService } from '@interv/state-interview';

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

  readonly profileId =
    this.route.snapshot.paramMap.get('profileId') ?? '';

  readonly profile = signal<ProfileModel | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly photoLoadFailed = signal(false);

  ngOnInit(): void {
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
    if (!this.profileId) {
      this.error.set('Profile not found.');
      this.isLoading.set(false);
      return;
    }
    try {
      const p = await this.interviewService.getPublicProfile(this.profileId);
      if (!p) {
        this.error.set('This profile is not available yet.');
      } else {
        this.photoLoadFailed.set(false);
        this.profile.set(p);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.isLoading.set(false);
    }
  }
}
