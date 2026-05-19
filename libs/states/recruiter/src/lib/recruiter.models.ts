import type { RecruiterInfo } from '@interv/state-interview';

export interface RecruiterInterviewStats {
  total: number;
  completed: number;
}

export interface RecruiterInterviewPage {
  items: RecruiterInterviewSummary[];
  nextCursor: unknown | null;
  hasMore: boolean;
}

export interface CandidateSearchPage {
  items: CandidateSearchResult[];
  nextCursor: unknown | null;
  hasMore: boolean;
}

export interface RecruiterProfile extends RecruiterInfo {
  uid: string;
  profileComplete: boolean;
  updatedAt: Date | null;
}

export interface CandidateSearchResult {
  id: string;
  name: string;
  title: string;
  photo: string;
  summary: string;
  skills: string[];
  /** Most recent interview this recruiter conducted with the candidate. */
  latestInterview: RecruiterInterviewSummary | null;
}

export interface RecruiterInterviewSummary {
  id: string;
  candidateProfileId: string;
  candidateName: string;
  candidateTitle: string;
  status: 'in_progress' | 'complete';
  feedbackScore: number | null;
  feedbackText: string | null;
  aiSummary: string | null;
  messageCount: number;
  hiddenFromRecruiter: boolean;
  createdAt: Date;
  completedAt: Date | null;
}

export interface RecruiterTranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | null;
}

export function isRecruiterProfileComplete(
  profile: RecruiterProfile | null,
): boolean {
  if (!profile) {
    return false;
  }
  return (
    profile.name.trim().length > 0 &&
    profile.role.trim().length > 0 &&
    profile.company.trim().length > 0
  );
}
