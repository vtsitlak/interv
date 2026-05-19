import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PROFILE_TWIN_INCOMPLETE_MESSAGE } from '../../util/profile-complete';
import { LogoComponent } from '../logo/logo';

@Component({
  selector: 'interv-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  readonly title = input('Interv');

  readonly isAuthenticated = input(false);

  readonly isRecruiter = input(false);

  readonly canTestInterview = input(false);

  readonly profileTwinIncompleteMessage = PROFILE_TWIN_INCOMPLETE_MESSAGE;

  readonly logoutRequested = output<void>();
  readonly resetProfileRequested = output<void>();
  readonly deleteAccountRequested = output<void>();

  readonly homeLink = computed(() => {
    if (!this.isAuthenticated()) {
      return '/';
    }
    return this.isRecruiter()
      ? '/recruiter/dashboard'
      : '/candidate/dashboard';
  });

  onLogoutClick(): void {
    this.logoutRequested.emit();
  }

  onResetProfileClick(): void {
    this.resetProfileRequested.emit();
  }

  onDeleteAccountClick(): void {
    this.deleteAccountRequested.emit();
  }
}
