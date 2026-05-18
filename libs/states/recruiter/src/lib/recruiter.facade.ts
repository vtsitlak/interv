import { computed, inject, Injectable } from '@angular/core';
import type { RecruiterInfo } from '@interv/state-interview';
import { RecruiterService } from './recruiter.service';
import { RecruiterStore } from './recruiter.store';
import type {
  CandidateSearchResult,
  RecruiterInterviewSummary,
} from './recruiter.models';

@Injectable({ providedIn: 'root' })
export class RecruiterFacade {
  private readonly store = inject(RecruiterStore);
  private readonly service = inject(RecruiterService);

  readonly profile = this.store.recruiterProfile;
  readonly profileLoading = this.store.profileLoading;
  readonly profileSaving = this.store.profileSaving;
  readonly profileError = this.store.profileError;
  readonly searchQuery = this.store.searchQuery;
  readonly searchResults = this.store.searchResults;
  readonly searchLoading = this.store.searchLoading;
  readonly interviews = this.store.interviews;
  readonly interviewsLoading = this.store.interviewsLoading;
  readonly selectedInterview = this.store.selectedInterview;
  readonly transcript = this.store.transcript;
  readonly transcriptLoading = this.store.transcriptLoading;
  readonly error = this.store.error;
  readonly isProfileComplete = this.store.isProfileComplete;
  readonly recruiterInfo = computed(() =>
    this.service.toRecruiterInfo(this.store.recruiterProfile()),
  );
  readonly totalInterviews = this.store.totalInterviews;
  readonly completedInterviews = this.store.completedInterviews;
  readonly averageScore = this.store.averageScore;

  loadProfile(): Promise<void> {
    return this.store.loadProfile();
  }

  saveProfile(info: RecruiterInfo): Promise<boolean> {
    return this.store.saveProfile(info);
  }

  setSearchQuery(query: string): void {
    this.store.setSearchQuery(query);
  }

  searchCandidates(): Promise<void> {
    return this.store.searchCandidates();
  }

  loadInterviews(): Promise<void> {
    return this.store.loadInterviews();
  }

  selectInterview(interview: RecruiterInterviewSummary): Promise<void> {
    return this.store.selectInterview(interview);
  }

  closeInterviewDetail(): void {
    this.store.closeInterviewDetail();
  }

  clearProfileError(): void {
    this.store.clearProfileError();
  }

  reset(): void {
    this.store.reset();
  }
}
