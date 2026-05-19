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
    | 'getInterviewsPage'
    | 'getInterviewStats'
    | 'getInterviewMessages'
    | 'hideInterviewForCandidate'
  >;
  let store: InstanceType<typeof DashboardStore>;

  beforeEach(() => {
    dashboardService = {
      getInterviewsPage: vi.fn().mockResolvedValue({
        items: [sampleInterview],
        nextCursor: null,
        hasMore: false,
      }),
      getInterviewStats: vi.fn().mockResolvedValue({
        total: 1,
        completed: 1,
        averageScore: 8,
      }),
      getInterviewMessages: vi.fn().mockResolvedValue([
        { role: 'user', content: 'Hi', timestamp: null },
      ]),
      hideInterviewForCandidate: vi.fn().mockResolvedValue(undefined),
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

    expect(dashboardService.getInterviewsPage).toHaveBeenCalled();
    expect(dashboardService.getInterviewStats).toHaveBeenCalled();
    expect(store.interviews()).toEqual([sampleInterview]);
    expect(store.isLoading()).toBe(false);
    expect(store.totalInterviews()).toBe(1);
    expect(store.averageScore()).toBe(8);
  });

  it('loadInterviews() sets error on failure', async () => {
    vi.mocked(dashboardService.getInterviewsPage).mockRejectedValueOnce(
      new Error('boom'),
    );

    await store.loadInterviews();

    expect(store.error()).toBe('boom');
    expect(store.isLoading()).toBe(false);
  });

  it('loadMoreInterviews() appends the next page', async () => {
    vi.mocked(dashboardService.getInterviewsPage)
      .mockResolvedValueOnce({
        items: [sampleInterview],
        nextCursor: { id: 'cursor' },
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [{ ...sampleInterview, id: 'int2' }],
        nextCursor: null,
        hasMore: false,
      });

    await store.loadInterviews();
    await store.loadMoreInterviews();

    expect(store.interviews()).toHaveLength(2);
    expect(store.isLoadingMoreInterviews()).toBe(false);
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

  it('hideInterview() removes the interview and refreshes stats', async () => {
    await store.loadInterviews();
    store.setSelected(sampleInterview);

    await store.hideInterview('int1');

    expect(dashboardService.hideInterviewForCandidate).toHaveBeenCalledWith(
      'int1',
    );
    expect(store.interviews()).toEqual([]);
    expect(store.selectedInterview()).toBeNull();
    expect(store.totalInterviews()).toBe(1);
  });
});
