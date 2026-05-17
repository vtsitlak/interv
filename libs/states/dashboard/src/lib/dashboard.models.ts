export interface InterviewSummary {
  id: string;
  recruiterName: string;
  recruiterRole: string;
  recruiterCompany: string;
  status: 'in_progress' | 'complete';
  feedbackScore: number | null;
  feedbackText: string | null;
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

export interface DashboardState {
  interviews: InterviewSummary[];
  selectedInterview: InterviewSummary | null;
  transcript: TranscriptMessage[];
  isLoading: boolean;
  isLoadingTranscript: boolean;
  error: string | null;
}

export const INITIAL_DASHBOARD_STATE: DashboardState = {
  interviews: [],
  selectedInterview: null,
  transcript: [],
  isLoading: false,
  isLoadingTranscript: false,
  error: null,
};

export function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
