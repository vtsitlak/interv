import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecruiterFacade } from '@interv/state-recruiter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecruiterCandidatesComponent } from './recruiter-candidates';

describe('RecruiterCandidatesComponent', () => {
  let fixture: ComponentFixture<RecruiterCandidatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecruiterCandidatesComponent],
      providers: [
        provideRouter([]),
        {
          provide: RecruiterFacade,
          useValue: {
            searchCandidates: vi.fn().mockResolvedValue(undefined),
            setSearchQuery: vi.fn(),
            loadMoreCandidates: vi.fn().mockResolvedValue(undefined),
            searchQuery: () => '',
            searchResults: () => [],
            searchLoading: () => false,
            isLoadingMoreCandidates: () => false,
            hasMoreCandidates: () => false,
            error: () => null,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecruiterCandidatesComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
