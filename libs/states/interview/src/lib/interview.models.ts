export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface RecruiterInfo {
  name: string;
  role: string;
  company: string;
}

export interface InterviewState {
  interviewId: string | null;
  profileId: string | null;
  recruiterInfo: RecruiterInfo | null;
  messages: ChatMessage[];
  messageCount: number;
  maxMessages: number;
  isStreaming: boolean;
  isComplete: boolean;
  isConnecting: boolean;
  /** WebSocket accepted and ready for send/receive */
  wsReady: boolean;
  showEndConfirmation: boolean;
  error: string | null;
}

/** Extra recruiter questions allowed when continuing after the default limit. */
export const INTERVIEW_MESSAGE_EXTENSION = 8;

export const INITIAL_INTERVIEW_STATE: InterviewState = {
  interviewId: null,
  profileId: null,
  recruiterInfo: null,
  messages: [],
  messageCount: 0,
  maxMessages: INTERVIEW_MESSAGE_EXTENSION,
  isStreaming: false,
  isComplete: false,
  isConnecting: false,
  wsReady: false,
  showEndConfirmation: false,
  error: null,
};

export const INTERVIEW_COMPLETE_SIGNAL = 'INTERVIEW_COMPLETE';

/** Sent by the WebSocket server after each assistant reply (not part of message text). */
export const ASSISTANT_STREAM_DONE_SIGNAL = '__ASSISTANT_STREAM_DONE__';

/** Server is working on a reply (keeps proxies from treating the socket as idle). */
export const ASSISTANT_PROCESSING_SIGNAL = '__ASSISTANT_PROCESSING__';

/** Plain-text error from FastAPI chat when `profiles/{id}` is missing for Admin SDK. */
export const BACKEND_PROFILE_NOT_FOUND = 'Profile not found';
