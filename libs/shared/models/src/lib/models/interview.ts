import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
}

export interface Feedback {
  text: string;
  score: number;
  submittedAt: Timestamp;
}

export interface Interview {
  id: string;
  profileId: string;
  recruiterName: string;
  recruiterRole: string;
  recruiterCompany: string;
  messages: ChatMessage[];
  status: 'in_progress' | 'complete';
  feedback: Feedback | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

export interface Session {
  sessionId: string;
  profileId: string;
  interviewId: string;
  messageCount: number;
  maxMessages: number;
  lastActivity: Timestamp;
  createdAt: Timestamp;
}
