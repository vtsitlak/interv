import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'interv-profile-visibility-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-visibility-settings.html',
})
export class ProfileVisibilitySettingsComponent {
  readonly isPublicProfileEnabled = input(true);
  readonly isDiscoverableByRecruiters = input(true);
  readonly isUpdating = input(false);
  readonly successMessage = input<string | null>(null);

  readonly publicProfileEnabledChange = output<boolean>();
  readonly discoverableByRecruitersChange = output<boolean>();

  onDisablePublicProfileChange(event: Event): void {
    const disabled = (event.target as HTMLInputElement).checked;
    this.publicProfileEnabledChange.emit(!disabled);
  }

  onHideFromRecruitersChange(event: Event): void {
    const hidden = (event.target as HTMLInputElement).checked;
    this.discoverableByRecruitersChange.emit(!hidden);
  }
}
