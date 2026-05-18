import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewFacade } from './interview.facade';
import { InterviewService } from './interview.service';
import { InterviewStore } from './interview.store';

describe('InterviewFacade', () => {
  let facade: InterviewFacade;
  let service: Pick<
    InterviewService,
    | 'assertCandidateProfileExists'
    | 'createInterview'
    | 'connect'
    | 'disconnect'
    | 'completeInterview'
    | 'extendMessageLimit'
  >;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigate: vi.fn().mockResolvedValue(true) };
    service = {
      assertCandidateProfileExists: vi.fn().mockResolvedValue(undefined),
      createInterview: vi.fn().mockResolvedValue('int1'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      completeInterview: vi.fn().mockResolvedValue(undefined),
      extendMessageLimit: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        InterviewStore,
        InterviewFacade,
        { provide: InterviewService, useValue: service },
        { provide: Router, useValue: router },
      ],
    });

    facade = TestBed.inject(InterviewFacade);
  });

  it('startInterview creates interview and connects websocket', async () => {
    await facade.startInterview('p1', {
      name: 'Jane',
      role: 'Recruiter',
      company: 'Acme',
    });

    expect(service.assertCandidateProfileExists).toHaveBeenCalledWith('p1');
    expect(service.createInterview).toHaveBeenCalledWith('p1', {
      name: 'Jane',
      role: 'Recruiter',
      company: 'Acme',
    });
    expect(service.connect).toHaveBeenCalled();
  });

  it('confirmEndInterview completes and navigates to feedback', async () => {
    const store = TestBed.inject(InterviewStore);
    store.setSession('p1', 'int1', {
      name: 'Jane',
      role: 'Recruiter',
      company: 'Acme',
    });
    store.showConfirmation();

    await facade.confirmEndInterview();

    expect(service.disconnect).toHaveBeenCalled();
    expect(service.completeInterview).toHaveBeenCalledWith('p1', 'int1');
    expect(router.navigate).toHaveBeenCalledWith(['/candidate', 'p1', 'feedback'], {
      queryParams: { interviewId: 'int1' },
    });
    expect(store.showEndConfirmation()).toBe(false);
  });

  it('cancelEndInterview after limit extends max messages and resumes chat', async () => {
    const store = TestBed.inject(InterviewStore);
    store.setSession('p1', 'int1', {
      name: 'Jane',
      role: 'Recruiter',
      company: 'Acme',
    });
    store.setWsReady(true);
    for (let i = 0; i < 8; i++) {
      store.addUserMessage(`q${i}`);
      store.finishStreaming();
    }
    store.setComplete();
    store.showConfirmation();

    facade.cancelEndInterview();
    await Promise.resolve();

    expect(store.isComplete()).toBe(false);
    expect(store.showEndConfirmation()).toBe(false);
    expect(store.maxMessages()).toBe(16);
    expect(service.extendMessageLimit).toHaveBeenCalledWith('p1', 'int1', 16);
    expect(store.canSendMessage()).toBe(true);
  });
});
