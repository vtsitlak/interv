import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { InterviewService } from '@interv/state-interview';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewSummaryComponent } from './interview-summary';

describe('InterviewSummaryComponent', () => {
  let fixture: ComponentFixture<InterviewSummaryComponent>;
  let component: InterviewSummaryComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewSummaryComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({
                profileId: 'p1',
                interviewId: 'i1',
              }),
            },
          },
        },
        {
          provide: InterviewService,
          useValue: {
            getPublicProfile: vi.fn().mockResolvedValue({ name: 'Ada' }),
            getInterviewForReview: vi.fn().mockResolvedValue({
              id: 'i1',
              profileId: 'p1',
              recruiterName: 'Recruiter',
              recruiterRole: '',
              recruiterCompany: '',
              status: 'complete',
              feedbackScore: 8,
              feedbackText: 'Great fit',
              aiSummary: 'Strong answers.',
              createdAt: new Date(),
              completedAt: new Date(),
            }),
            getInterviewMessages: vi.fn().mockResolvedValue([]),
            submitFeedback: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InterviewSummaryComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
    await fixture.whenStable();
  });

  it('loads interview review data', () => {
    expect(component.interview()?.feedbackScore).toBe(8);
    expect(component.candidateName()).toBe('Ada');
  });

  it('scoreBadgeClass returns success for high scores', () => {
    expect(component.scoreBadgeClass(9)).toContain('success');
  });
});
