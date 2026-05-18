import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'lib-recruiter-coming-soon',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recruiter-coming-soon.html',
})
export class RecruiterComingSoonComponent {
  private readonly route = inject(ActivatedRoute);

  readonly heading = computed(
    () => (this.route.snapshot.data['heading'] as string) ?? 'Recruiter',
  );
}
