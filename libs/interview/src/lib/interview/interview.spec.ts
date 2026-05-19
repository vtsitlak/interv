import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthFacade } from '@interv/state-auth';
import { InterviewFacade, InterviewService } from '@interv/state-interview';
import { ProfileFacade } from '@interv/state-profile';
import { RecruiterFacade } from '@interv/state-recruiter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewComponent } from './interview';

describe('InterviewComponent', () => {
  let component: InterviewComponent;
  let fixture: ComponentFixture<InterviewComponent>;
  let loadProfile: ReturnType<typeof vi.fn>;
  let isComplete: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    loadProfile = vi.fn().mockResolvedValue(undefined);
    isComplete = vi.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [InterviewComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ profileId: 'p1' }),
              data: { testMode: false },
            },
            firstChild: null,
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            user: () => ({ uid: 'p1' }),
            isRecruiter: () => false,
          },
        },
        {
          provide: ProfileFacade,
          useValue: {
            loadProfile,
            isComplete,
          },
        },
        {
          provide: RecruiterFacade,
          useValue: {
            loadProfile: vi.fn().mockResolvedValue(undefined),
            recruiterInfo: () => ({
              name: 'Jane',
              role: 'Recruiter',
              company: 'Acme',
            }),
          },
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

  it('blocks practice mode when profile is incomplete', async () => {
    isComplete.mockReturnValue(false);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [InterviewComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              data: { testMode: true },
            },
            firstChild: null,
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            user: () => ({ uid: 'p1' }),
            isRecruiter: () => false,
          },
        },
        {
          provide: ProfileFacade,
          useValue: {
            loadProfile,
            isComplete,
          },
        },
        {
          provide: RecruiterFacade,
          useValue: {
            loadProfile: vi.fn(),
            recruiterInfo: () => null,
          },
        },
        {
          provide: InterviewService,
          useValue: {
            getSuggestedQuestions: vi.fn().mockResolvedValue([]),
          },
        },
        {
          provide: InterviewFacade,
          useValue: {
            disconnect: vi.fn(),
            startInterview: vi.fn().mockResolvedValue(undefined),
            messages: () => [],
            isStreaming: () => false,
            canSendMessage: () => false,
            messageCount: () => 0,
            maxMessages: () => 8,
            error: () => null,
            isComplete: () => false,
            showEndConfirmation: () => false,
            isConnecting: () => false,
          },
        },
      ],
    }).compileComponents();

    const practiceFixture = TestBed.createComponent(InterviewComponent);
    practiceFixture.detectChanges();
    await practiceFixture.whenStable();

    expect(loadProfile).toHaveBeenCalled();
    expect(practiceFixture.componentInstance.profileNotReady()).toBe(true);
    expect(
      TestBed.inject(InterviewFacade).startInterview,
    ).not.toHaveBeenCalled();
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

  it('onConfirmEnd skips feedback in practice mode', () => {
    const facade = TestBed.inject(InterviewFacade);
    component.isPracticeMode.set(true);
    component.onConfirmEnd();
    expect(facade.confirmEndInterview).toHaveBeenCalledWith({
      skipFeedback: true,
    });
  });
});
