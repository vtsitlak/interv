import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import type { CandidateSearchResult } from '@interv/state-recruiter';
import { RouterLink } from '@angular/router';
import { InfiniteScrollDirective } from '@interv/shared';
import { RecruiterFacade } from '@interv/state-recruiter';

@Component({
  selector: 'interv-recruiter-candidates',
  standalone: true,
  imports: [RouterLink, InfiniteScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recruiter-candidates.html',
})
export class RecruiterCandidatesComponent implements OnInit {
  readonly recruiter = inject(RecruiterFacade);
  private readonly photoFailedIds = signal<ReadonlySet<string>>(new Set());

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

  hasProfilePhoto(candidate: CandidateSearchResult): boolean {
    return (
      !!candidate.photo?.trim() && !this.photoFailedIds().has(candidate.id)
    );
  }

  profileInitial(name: string): string {
    const initial = name.trim().charAt(0);
    return initial ? initial.toUpperCase() : '?';
  }

  onPhotoError(candidateId: string): void {
    this.photoFailedIds.update((ids) => new Set([...ids, candidateId]));
  }
}
