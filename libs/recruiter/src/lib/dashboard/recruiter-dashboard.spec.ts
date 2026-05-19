import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecruiterFacade } from '@interv/state-recruiter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecruiterDashboardComponent } from './recruiter-dashboard';

describe('RecruiterDashboardComponent', () => {
  let fixture: ComponentFixture<RecruiterDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecruiterDashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: RecruiterFacade,
          useValue: {
            loadInterviews: vi.fn().mockResolvedValue(undefined),
            selectInterview: vi.fn(),
            interviews: () => [],
            totalInterviews: () => 0,
            completedInterviews: () => 0,
            selectedInterview: () => null,
            transcript: () => [],
            interviewsLoading: () => false,
            isLoadingMoreInterviews: () => false,
            hasMoreInterviews: () => false,
            loadMoreInterviews: vi.fn().mockResolvedValue(undefined),
            transcriptLoading: () => false,
            hideInterview: vi.fn().mockResolvedValue(undefined),
            error: () => null,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecruiterDashboardComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
