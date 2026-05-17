import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from '@angular/fire/firestore';
import type { Feedback } from '@interv/models';
import type { InterviewSummary, TranscriptMessage } from './dashboard.models';

interface InterviewDoc {
  recruiterName?: string;
  recruiterRole?: string;
  recruiterCompany?: string;
  status?: InterviewSummary['status'];
  feedback?: Feedback | null;
  aiSummary?: string | null;
  messages?: { role: string; content: string; timestamp?: Timestamp }[];
  createdAt?: Timestamp;
  completedAt?: Timestamp | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  private profileId(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  async getInterviews(): Promise<InterviewSummary[]> {
    const profileId = this.profileId();
    if (!profileId) {
      return [];
    }

    const ref = collection(
      this.firestore,
      'profiles',
      profileId,
      'interviews',
    );
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => {
      const data = docSnap.data() as InterviewDoc;
      const feedback = data.feedback ?? null;
      return {
        id: docSnap.id,
        recruiterName: data.recruiterName ?? '',
        recruiterRole: data.recruiterRole ?? '',
        recruiterCompany: data.recruiterCompany ?? '',
        status: data.status ?? 'in_progress',
        feedbackScore: feedback?.score ?? null,
        feedbackText: feedback?.text ?? null,
        aiSummary: data.aiSummary ?? null,
        messageCount:
          data.messages?.filter((m) => m.role === 'user').length ??
          data.messages?.length ??
          0,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        completedAt: data.completedAt?.toDate() ?? null,
      };
    });
  }

  async getInterviewMessages(
    profileId: string,
    interviewId: string,
  ): Promise<TranscriptMessage[]> {
    const ref = doc(
      this.firestore,
      'profiles',
      profileId,
      'interviews',
      interviewId,
    );
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return [];
    }

    const data = snap.data() as InterviewDoc;
    const messages = data.messages ?? [];
    return messages.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content ?? '',
      timestamp: message.timestamp?.toDate() ?? null,
    }));
  }
}
