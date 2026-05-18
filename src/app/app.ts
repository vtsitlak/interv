import { Component, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@interv/ui';
import { AuthFacade } from '@interv/state-auth';
import { take } from 'rxjs';

@Component({
  imports: [RouterOutlet, HeaderComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = 'Interv';
  protected readonly authFacade = inject(AuthFacade);
  private readonly auth = inject(Auth);

  constructor() {
    void this.authFacade.tryHandleRedirectResult();
    authState(this.auth)
      .pipe(take(1))
      .subscribe((user) => {
        if (!user) {
          return;
        }
        void this.authFacade.setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      });
  }

  protected async onLogout(): Promise<void> {
    await this.authFacade.logout();
  }
}
