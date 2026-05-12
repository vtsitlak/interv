import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthFacade } from '@interv/state-auth';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'interv';
  private readonly authFacade = inject(AuthFacade);

  constructor() {
    void this.authFacade.tryHandleRedirectResult();
  }
}
