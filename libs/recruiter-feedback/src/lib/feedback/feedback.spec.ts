import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { InterviewService } from '@interv/state-interview';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackComponent } from './feedback';

describe('FeedbackComponent', () => {
  let component: FeedbackComponent;
  let fixture: ComponentFixture<FeedbackComponent>;
  const submitFeedback = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    submitFeedback.mockClear();

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
            },
          },
        },
        {
          provide: InterviewService,
          useValue: {
            submitFeedback,
            getInterviewMessages: vi.fn().mockResolvedValue([]),
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

  it('onSubmit saves feedback when form is valid', async () => {
    component.feedbackModel.set({ score: 9, text: 'Great conversation' });

    await component.onSubmit();

    expect(submitFeedback).toHaveBeenCalledWith('p1', 'int1', 9, 'Great conversation');
    expect(component.submitted()).toBe(true);
  });
});
