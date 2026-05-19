import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { InfiniteScrollDirective, ProfilePhotoComponent } from '@interv/shared';
import { RecruiterFacade } from '@interv/state-recruiter';

@Component({
  selector: 'interv-recruiter-candidates',
  standalone: true,
  imports: [RouterLink, InfiniteScrollDirective, ProfilePhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recruiter-candidates.html',
})
export class RecruiterCandidatesComponent implements OnInit {
  readonly recruiter = inject(RecruiterFacade);

  ngOnInit(): void {
    void this.recruiter.searchCandidates();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.recruiter.setSearchQuery(value);
  }

  onSearch(): void {
    void this.recruiter.searchCandidates();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.recruiter.searchCandidates();
    }
  }

  loadMoreCandidates(): void {
    void this.recruiter.loadMoreCandidates();
  }

  skillsPreview(skills: string[]): string {
    return skills.slice(0, 5).join(' · ');
  }
}
