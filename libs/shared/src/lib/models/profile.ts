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
  /**
   * Unique public handle used in `/candidate/:username`.
   * Internal Firestore doc id remains the Firebase uid.
   */
  username?: string;
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
  /** When false, public profile shows username instead of full name. Default true. */
  showFullNameOnPublicProfile?: boolean;
  /** Visible in recruiter search when true. */
  isPublished: boolean;
  /** Public link (/candidate/:username) and anonymous interviews when true. */
  isPublicProfileEnabled?: boolean;
  shareUrl: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
