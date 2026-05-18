import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'lib-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  readonly title = input('Interv');

  readonly isAuthenticated = input(false);

  readonly isRecruiter = input(false);

  readonly logoutRequested = output<void>();

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
}
