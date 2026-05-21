import { Timestamp } from 'firebase/firestore';
import type { WorkPreference } from './work-preferences';

export interface ProfileLink {
  link: string;
  description: string;
}

export interface QAPair {
  question: string;
  answer: string;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  title: string;
  photo: string;
  summary: string;
  cvText: string;
  linkedIn?: string;
  workPreferences?: WorkPreference[];
  links: ProfileLink[];
  personalQA: QAPair[];
  skills?: string[];
  /** AI-generated career summary shown on the public profile (set on train/ingest). */
  careerOverview?: string;
  /** Visible in recruiter search when true. */
  isPublished: boolean;
  /** Public link (/candidate/:id) and anonymous interviews when true. */
  isPublicProfileEnabled?: boolean;
  shareUrl: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
