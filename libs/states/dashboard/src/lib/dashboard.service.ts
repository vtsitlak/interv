import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  arrayUnion,
  collection,
  doc,
  Firestore,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
} from '@angular/fire/firestore';
import {
  INTERV_LIST_PAGE_SIZE,
  isHiddenFromAudience,
  type Feedback,
} from '@interv/shared';
import { isPracticeRecruiterInfo } from '@interv/state-interview';
import type {
  InterviewPage,
  InterviewStats,
  InterviewSummary,
  TranscriptMessage,
} from './dashboard.models';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

interface InterviewDoc {
  recruiterName?: string;
  recruiterRole?: string;
  recruiterCompany?: string;
  recruiterUid?: string | null;
  status?: InterviewSummary['status'];
  feedback?: Feedback | null;
  aiSummary?: string | null;
  hidden?: unknown;
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

  async getInterviewsPage(
    pageSize = INTERV_LIST_PAGE_SIZE,
    cursor: QueryDocumentSnapshot | null = null,
  ): Promise<InterviewPage> {
    const profileId = this.profileId();
    if (!profileId) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const ref = collection(
      this.firestore,
      'profiles',
      profileId,
      'interviews',
    );
    const constraints = [
      orderBy('createdAt', 'desc'),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(pageSize + 1),
    ];
    const snap = await getDocs(query(ref, ...constraints));
    const hasMore = snap.docs.length > pageSize;
    const pageDocs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
    const items = pageDocs
      .filter(
        (docSnap) =>
          !isHiddenFromAudience(
            (docSnap.data() as InterviewDoc).hidden,
            'candidate',
          ),
      )
      .map((docSnap) =>
        this.mapInterviewDoc(docSnap.id, docSnap.data() as InterviewDoc),
      );

    return {
      items,
      nextCursor: pageDocs.length ? pageDocs[pageDocs.length - 1] : null,
      hasMore,
    };
  }

  async getInterviewStats(): Promise<InterviewStats> {
    const profileId = this.profileId();
    if (!profileId) {
      return { total: 0, completed: 0, averageScore: null };
    }

    const ref = collection(
      this.firestore,
      'profiles',
      profileId,
      'interviews',
    );
    const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')));
    const interviews = snap.docs
      .filter(
        (docSnap) =>
          !isHiddenFromAudience(
            (docSnap.data() as InterviewDoc).hidden,
            'candidate',
          ),
      )
      .map((docSnap) =>
        this.mapInterviewDoc(docSnap.id, docSnap.data() as InterviewDoc),
      );

    const completed = interviews.filter((i) => i.status === 'complete').length;
    const scored = interviews.filter(
      (i) => !i.isPracticeSession && i.feedbackScore !== null,
    );
    const averageScore =
      scored.length === 0
        ? null
        : Math.round(
            (scored.reduce((acc, i) => acc + (i.feedbackScore ?? 0), 0) /
              scored.length) *
              10,
          ) / 10;

    return {
      total: interviews.length,
      completed,
      averageScore,
    };
  }

  async hideInterviewForCandidate(interviewId: string): Promise<void> {
    const profileId = this.profileId();
    if (!profileId) {
      throw new Error('You must be signed in to remove an interview.');
    }

    const ref = doc(
      this.firestore,
      'profiles',
      profileId,
      'interviews',
      interviewId,
    );
    await updateDoc(ref, { hidden: arrayUnion('candidate') });

    const snap = await getDoc(ref);
    const recruiterUid = snap.data()?.['recruiterUid'] as string | null | undefined;
    if (recruiterUid) {
      await setDoc(
        doc(this.firestore, 'recruiters', recruiterUid, 'interviews', interviewId),
        { hidden: arrayUnion('candidate') },
        { merge: true },
      );
    }
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

  private mapInterviewDoc(id: string, data: InterviewDoc): InterviewSummary {
    const recruiterName = data.recruiterName ?? '';
    const recruiterRole = data.recruiterRole ?? '';
    const recruiterCompany = data.recruiterCompany ?? '';
    const isPracticeSession = isPracticeRecruiterInfo({
      name: recruiterName,
      role: recruiterRole,
      company: recruiterCompany,
    });
    const feedback = isPracticeSession ? null : (data.feedback ?? null);
    const requestContact = feedback?.requestContact === true;
    const recruiterContactEmail =
      requestContact && feedback?.recruiterEmail?.trim()
        ? feedback.recruiterEmail.trim()
        : null;

    return {
      id,
      recruiterName,
      recruiterRole,
      recruiterCompany,
      isPracticeSession,
      status: data.status ?? 'in_progress',
      feedbackScore: feedback?.score ?? null,
      feedbackText: feedback?.text ?? null,
      requestContact,
      recruiterContactEmail,
      aiSummary: data.aiSummary ?? null,
      messageCount:
        data.messages?.filter((m) => m.role === 'user').length ??
        data.messages?.length ??
        0,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      completedAt: data.completedAt?.toDate() ?? null,
    };
  }
}
