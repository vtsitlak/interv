import { Component, effect, inject, untracked, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@interv/shared';
import { AuthFacade, AuthSyncService } from '@interv/state-auth';
import { ProfileFacade } from '@interv/state-profile';

@Component({
  imports: [RouterOutlet, HeaderComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = 'Interv';
  protected readonly authFacade = inject(AuthFacade);
  protected readonly profileFacade = inject(ProfileFacade);
  /** Ensures Firebase Auth stays synced with {@link AuthStore} for the app lifetime. */
  private readonly authSync = inject(AuthSyncService);

  constructor() {
    void this.authFacade.tryHandleRedirectResult();

    effect(() => {
      const uid = this.authFacade.user()?.uid;
      const isCandidate = this.authFacade.isCandidate();
      if (!uid || !isCandidate) {
        return;
      }
      untracked(() => {
        void this.profileFacade.loadProfile();
      });
    });
  }

  protected async onLogout(): Promise<void> {
    await this.authFacade.logout();
  }
}
