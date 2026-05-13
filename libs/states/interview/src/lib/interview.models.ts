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
  error: string | null;
}

export const INITIAL_INTERVIEW_STATE: InterviewState = {
  interviewId: null,
  profileId: null,
  recruiterInfo: null,
  messages: [],
  messageCount: 0,
  maxMessages: 8,
  isStreaming: false,
  isComplete: false,
  isConnecting: false,
  wsReady: false,
  error: null,
};

export const INTERVIEW_COMPLETE_SIGNAL = 'INTERVIEW_COMPLETE';

/** Sent by the WebSocket server after each assistant reply (not part of message text). */
export const ASSISTANT_STREAM_DONE_SIGNAL = '__ASSISTANT_STREAM_DONE__';
