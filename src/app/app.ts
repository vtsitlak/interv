import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@interv/ui';
import { AuthFacade } from '@interv/state-auth';

@Component({
  imports: [RouterOutlet, HeaderComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = 'Interv';
  protected readonly authFacade = inject(AuthFacade);

  constructor() {
    void this.authFacade.tryHandleRedirectResult();
  }

  protected async onLogout(): Promise<void> {
    await this.authFacade.logout();
  }
}
