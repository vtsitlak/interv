import { Timestamp } from 'firebase/firestore';

export interface ProfileLink {
  label: string;
  url: string;
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
  links: ProfileLink[];
  personalQA: QAPair[];
  isPublished: boolean;
  shareUrl: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}