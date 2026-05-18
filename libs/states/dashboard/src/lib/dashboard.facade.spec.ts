import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InterviewSummary } from './dashboard.models';
import { DashboardFacade } from './dashboard.facade';
import { DashboardStore } from './dashboard.store';

const interview: InterviewSummary = {
  id: 'int1',
  recruiterName: 'Alex',
  recruiterRole: 'HR',
  recruiterCompany: 'Acme',
  isPracticeSession: false,
  status: 'in_progress',
  feedbackScore: null,
  feedbackText: null,
  messageCount: 0,
  createdAt: new Date(),
  completedAt: null,
};

describe('DashboardFacade', () => {
  let facade: DashboardFacade;
  let storeMock: {
    interviews: ReturnType<typeof vi.fn>;
    selectedInterview: ReturnType<typeof vi.fn>;
    transcript: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    isLoadingTranscript: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    totalInterviews: ReturnType<typeof vi.fn>;
    completedInterviews: ReturnType<typeof vi.fn>;
    averageScore: ReturnType<typeof vi.fn>;
    loadInterviews: ReturnType<typeof vi.fn>;
    setSelected: ReturnType<typeof vi.fn>;
    loadTranscript: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    storeMock = {
      interviews: vi.fn().mockReturnValue([]),
      selectedInterview: vi.fn().mockReturnValue(null),
      transcript: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      isLoadingTranscript: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
      totalInterviews: vi.fn().mockReturnValue(0),
      completedInterviews: vi.fn().mockReturnValue(0),
      averageScore: vi.fn().mockReturnValue(null),
      loadInterviews: vi.fn().mockResolvedValue(undefined),
      setSelected: vi.fn(),
      loadTranscript: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardFacade,
        { provide: DashboardStore, useValue: storeMock },
        { provide: Auth, useValue: { currentUser: { uid: 'u1' } } },
      ],
    });

    facade = TestBed.inject(DashboardFacade);
  });

  it('loadInterviews() delegates to the store', async () => {
    await facade.loadInterviews();
    expect(storeMock.loadInterviews).toHaveBeenCalled();
  });

  it('selectInterview() selects and loads transcript when signed in', async () => {
    await facade.selectInterview(interview);

    expect(storeMock.setSelected).toHaveBeenCalledWith(interview);
    expect(storeMock.loadTranscript).toHaveBeenCalledWith('u1', 'int1');
  });

  it('closeDetail() clears selection', () => {
    facade.closeDetail();
    expect(storeMock.setSelected).toHaveBeenCalledWith(null);
  });
});
