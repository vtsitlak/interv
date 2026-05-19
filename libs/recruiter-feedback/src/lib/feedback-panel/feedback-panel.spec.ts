import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthFacade } from '@interv/state-auth';
import { InterviewService } from '@interv/state-interview';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewFeedbackPanelComponent } from './feedback-panel';

describe('InterviewFeedbackPanelComponent', () => {
  let fixture: ComponentFixture<InterviewFeedbackPanelComponent>;
  const submitFeedback = vi.fn().mockResolvedValue(undefined);
  const getInterviewForReview = vi.fn().mockResolvedValue(null);

  beforeEach(async () => {
    submitFeedback.mockClear();
    getInterviewForReview.mockClear();

    await TestBed.configureTestingModule({
      imports: [InterviewFeedbackPanelComponent],
      providers: [
        {
          provide: AuthFacade,
          useValue: {
            user: () => ({ uid: 'r1', email: 'recruiter@example.com' }),
          },
        },
        {
          provide: InterviewService,
          useValue: {
            submitFeedback,
            getInterviewForReview,
            getInterviewMessages: vi.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InterviewFeedbackPanelComponent);
    fixture.componentRef.setInput('profileId', 'p1');
    fixture.componentRef.setInput('interviewId', 'int1');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('submits feedback when form is valid', async () => {
    const component = fixture.componentInstance;
    component.feedbackModel.set({
      score: 7,
      text: 'Solid answers',
      requestContact: false,
    });

    await component.onSubmit();

    expect(submitFeedback).toHaveBeenCalledWith(
      'p1',
      'int1',
      7,
      'Solid answers',
      { requestContact: false, recruiterEmail: null },
    );
  });

  it('includes recruiter email when contact is requested', async () => {
    const component = fixture.componentInstance;
    component.feedbackModel.set({
      score: 9,
      text: 'Great twin',
      requestContact: true,
    });

    await component.onSubmit();

    expect(submitFeedback).toHaveBeenCalledWith(
      'p1',
      'int1',
      9,
      'Great twin',
      {
        requestContact: true,
        recruiterEmail: 'recruiter@example.com',
      },
    );
  });
});
