export interface InterviewSummary {
  id: string;
  recruiterName: string;
  recruiterRole: string;
  recruiterCompany: string;
  /** Self-test via /test-interview (no recruiter feedback). */
  isPracticeSession: boolean;
  status: 'in_progress' | 'complete';
  feedbackScore: number | null;
  feedbackText: string | null;
  requestContact: boolean;
  recruiterContactEmail: string | null;
  aiSummary: string | null;
  messageCount: number;
  createdAt: Date;
  completedAt: Date | null;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | null;
}

export interface InterviewStats {
  total: number;
  completed: number;
  averageScore: number | null;
}

export interface InterviewPage {
  items: InterviewSummary[];
  nextCursor: unknown | null;
  hasMore: boolean;
}

export interface DashboardState {
  interviews: InterviewSummary[];
  selectedInterview: InterviewSummary | null;
  transcript: TranscriptMessage[];
  isLoading: boolean;
  isLoadingMoreInterviews: boolean;
  isLoadingTranscript: boolean;
  hasMoreInterviews: boolean;
  interviewsPageCursor: unknown | null;
  interviewStats: InterviewStats | null;
  error: string | null;
}

export const INITIAL_DASHBOARD_STATE: DashboardState = {
  interviews: [],
  selectedInterview: null,
  transcript: [],
  isLoading: false,
  isLoadingMoreInterviews: false,
  isLoadingTranscript: false,
  hasMoreInterviews: false,
  interviewsPageCursor: null,
  interviewStats: null,
  error: null,
};

export function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
