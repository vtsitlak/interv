import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InterviewSummary } from './dashboard.models';
import { DashboardService } from './dashboard.service';
import { DashboardStore } from './dashboard.store';

const sampleInterview: InterviewSummary = {
  id: 'int1',
  recruiterName: 'Alex',
  recruiterRole: 'HR',
  recruiterCompany: 'Acme',
  isPracticeSession: false,
  status: 'complete',
  feedbackScore: 8,
  feedbackText: 'Great fit',
  requestContact: true,
  recruiterContactEmail: 'alex@acme.com',
  aiSummary: 'Recruiter learned about Angular experience.',
  messageCount: 4,
  createdAt: new Date('2025-01-01'),
  completedAt: new Date('2025-01-02'),
};

describe('DashboardStore', () => {
  let dashboardService: Pick<
    DashboardService,
    'getInterviews' | 'getInterviewMessages'
  >;
  let store: InstanceType<typeof DashboardStore>;

  beforeEach(() => {
    dashboardService = {
      getInterviews: vi.fn().mockResolvedValue([sampleInterview]),
      getInterviewMessages: vi.fn().mockResolvedValue([
        { role: 'user', content: 'Hi', timestamp: null },
      ]),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardStore,
        { provide: DashboardService, useValue: dashboardService },
      ],
    });

    store = TestBed.inject(DashboardStore);
  });

  it('loadInterviews() fills interviews and clears loading', async () => {
    await store.loadInterviews();

    expect(dashboardService.getInterviews).toHaveBeenCalled();
    expect(store.interviews()).toEqual([sampleInterview]);
    expect(store.isLoading()).toBe(false);
    expect(store.totalInterviews()).toBe(1);
    expect(store.averageScore()).toBe(8);
  });

  it('loadInterviews() sets error on failure', async () => {
    vi.mocked(dashboardService.getInterviews).mockRejectedValueOnce(
      new Error('boom'),
    );

    await store.loadInterviews();

    expect(store.error()).toBe('boom');
    expect(store.isLoading()).toBe(false);
  });

  it('loadTranscript() stores messages for the selected interview', async () => {
    await store.loadTranscript('u1', 'int1');

    expect(dashboardService.getInterviewMessages).toHaveBeenCalledWith(
      'u1',
      'int1',
    );
    expect(store.transcript()).toHaveLength(1);
    expect(store.isLoadingTranscript()).toBe(false);
  });
});
