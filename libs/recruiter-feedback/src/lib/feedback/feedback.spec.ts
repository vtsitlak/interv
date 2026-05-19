import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthFacade } from '@interv/state-auth';
import { InterviewService } from '@interv/state-interview';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackComponent } from './feedback';

describe('FeedbackComponent', () => {
  let component: FeedbackComponent;
  let fixture: ComponentFixture<FeedbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ profileId: 'p1' }),
              queryParamMap: convertToParamMap({ interviewId: 'int1' }),
              data: { recruiterFeedback: true },
            },
          },
        },
        {
          provide: InterviewService,
          useValue: {
            submitFeedback: vi.fn().mockResolvedValue(undefined),
            getInterviewForReview: vi.fn().mockResolvedValue(null),
            getInterviewMessages: vi.fn().mockResolvedValue([]),
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            user: () => ({ uid: 'r1', email: 'recruiter@example.com' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('marks saved when panel emits feedbackSaved', () => {
    component.onFeedbackSaved({ score: 9, text: 'Great', requestContact: true });
    expect(component.saved()).toBe(true);
    expect(component.savedScore()).toBe(9);
  });
});
