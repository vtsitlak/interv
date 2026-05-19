import type { ProfileLink, QAPair } from '../models/profile';
import type { WorkPreference } from '../models/work-preferences';

export interface ProfileTrainFormSnapshot {
  name: string;
  title: string;
  photo: string;
  summary: string;
  cvText: string;
  linkedIn: string;
  workPreferences: WorkPreference[];
  links: ProfileLink[];
  personalQA: QAPair[];
}

export interface RecruiterFormSnapshot {
  name: string;
  role: string;
  company: string;
}

export interface FeedbackFormSnapshot {
  score: number;
  text: string;
  requestContact: boolean;
}

export function serializeProfileTrainForm(
  model: ProfileTrainFormSnapshot,
): string {
  return JSON.stringify({
    name: model.name.trim(),
    title: model.title.trim(),
    photo: model.photo.trim(),
    summary: model.summary.trim(),
    cvText: model.cvText.trim(),
    linkedIn: model.linkedIn.trim(),
    workPreferences: [...model.workPreferences].sort(),
    links: model.links.map((link) => ({
      link: link.link.trim(),
      description: link.description.trim(),
    })),
    personalQA: model.personalQA.map((qa) => ({
      question: qa.question.trim(),
      answer: qa.answer.trim(),
    })),
  });
}

export function serializeRecruiterForm(model: RecruiterFormSnapshot): string {
  return JSON.stringify({
    name: model.name.trim(),
    role: model.role.trim(),
    company: model.company.trim(),
  });
}

export function serializeFeedbackForm(model: FeedbackFormSnapshot): string {
  return JSON.stringify({
    score: Math.min(10, Math.max(1, Math.round(model.score))),
    text: model.text.trim(),
    requestContact: model.requestContact,
  });
}
