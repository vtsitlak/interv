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
    'assertCandidateProfileExists' | 'createInterview' | 'connect' | 'disconnect'
  >;

  beforeEach(() => {
    service = {
      assertCandidateProfileExists: vi.fn().mockResolvedValue(undefined),
      createInterview: vi.fn().mockResolvedValue('int1'),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        InterviewStore,
        InterviewFacade,
        { provide: InterviewService, useValue: service },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
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
});
