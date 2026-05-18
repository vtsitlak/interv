import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthFacade } from '@interv/state-auth';
import { InterviewFacade, InterviewService } from '@interv/state-interview';
import { InterviewComponent } from './interview';

describe('InterviewComponent', () => {
  let component: InterviewComponent;
  let fixture: ComponentFixture<InterviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ profileId: 'p1' }),
              data: { testMode: false },
            },
          },
        },
        {
          provide: AuthFacade,
          useValue: { user: () => ({ uid: 'p1' }) },
        },
        {
          provide: InterviewService,
          useValue: {
            getSuggestedQuestions: vi.fn().mockResolvedValue(['Hello?']),
          },
        },
        {
          provide: InterviewFacade,
          useValue: {
            disconnect: vi.fn(),
            isConnecting: () => false,
            wsReady: () => false,
            messages: () => [],
            isStreaming: () => false,
            canSendMessage: () => true,
            messageCount: () => 0,
            maxMessages: () => 8,
            error: () => null,
            isComplete: () => false,
            showEndConfirmation: () => false,
            startInterview: vi.fn().mockResolvedValue(undefined),
            sendMessage: vi.fn().mockResolvedValue(undefined),
            requestEndInterview: vi.fn(),
            cancelEndInterview: vi.fn(),
            confirmEndInterview: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InterviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onSetupStart calls facade and completes setup on success', async () => {
    const facade = TestBed.inject(InterviewFacade);
    await component.onSetupStart({
      name: 'Jane',
      role: 'Recruiter',
      company: 'Acme',
    });
    expect(facade.startInterview).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ name: 'Jane' }),
    );
    expect(component.isSetupComplete()).toBe(true);
  });

  it('onConfirmEnd skips feedback in test mode', () => {
    const facade = TestBed.inject(InterviewFacade);
    component.skipSetup.set(true);
    component.onConfirmEnd();
    expect(facade.confirmEndInterview).toHaveBeenCalledWith({
      skipFeedback: true,
    });
  });
});
