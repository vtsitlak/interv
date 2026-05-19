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
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  startAfter,
  updateDoc,
} from '@angular/fire/firestore';
import type { Profile } from '@interv/shared';
import { INTERV_LIST_PAGE_SIZE, isHiddenFromAudience } from '@interv/shared';
import type { RecruiterInfo } from '@interv/state-interview';
import type {
  CandidateSearchPage,
  CandidateSearchResult,
  RecruiterInterviewPage,
  RecruiterInterviewStats,
  RecruiterInterviewSummary,
  RecruiterProfile,
  RecruiterTranscriptMessage,
} from './recruiter.models';
import { isRecruiterProfileComplete } from './recruiter.models';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

interface RecruiterDoc {
  name?: string;
  role?: string;
  company?: string;
  profileComplete?: boolean;
  updatedAt?: Timestamp;
}

interface InterviewDoc {
  profileId?: string;
  candidateName?: string;
  candidateTitle?: string;
  status?: RecruiterInterviewSummary['status'];
  feedback?: { score?: number; text?: string } | null;
  aiSummary?: string | null;
  messageCount?: number;
  hidden?: unknown;
  messages?: { role: string; content: string; timestamp?: Timestamp }[];
  createdAt?: Timestamp;
  completedAt?: Timestamp | null;
}

@Injectable({ providedIn: 'root' })
export class RecruiterService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  private recruiterId(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  async getProfile(uid?: string): Promise<RecruiterProfile | null> {
    const id = uid ?? this.recruiterId();
    if (!id) {
      return null;
    }

    const snap = await getDoc(doc(this.firestore, 'recruiters', id));
    if (!snap.exists()) {
      return {
        uid: id,
        name: '',
        role: '',
        company: '',
        profileComplete: false,
        updatedAt: null,
      };
    }

    const data = snap.data() as RecruiterDoc;
    return {
      uid: id,
      name: data.name ?? '',
      role: data.role ?? '',
      company: data.company ?? '',
      profileComplete: data.profileComplete === true,
      updatedAt: data.updatedAt?.toDate() ?? null,
    };
  }

  async saveProfile(info: RecruiterInfo): Promise<RecruiterProfile> {
    const id = this.recruiterId();
    if (!id) {
      throw new Error('You must be signed in to save your recruiter profile.');
    }

    const profile: RecruiterProfile = {
      uid: id,
      name: info.name.trim(),
      role: info.role.trim(),
      company: info.company.trim(),
      profileComplete: true,
      updatedAt: new Date(),
    };

    try {
      await setDoc(
        doc(this.firestore, 'recruiters', id),
        {
          name: profile.name,
          role: profile.role,
          company: profile.company,
          profileComplete: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e: unknown) {
      const code =
        e !== null &&
        typeof e === 'object' &&
        'code' in e &&
        typeof (e as { code: unknown }).code === 'string'
          ? (e as { code: string }).code
          : null;
      if (code === 'permission-denied') {
        throw new Error(
          'Could not save recruiter profile. Deploy the latest Firestore rules (npm run deploy:firestore:rules) and try again.',
        );
      }
      throw e;
    }

    return profile;
  }

  profileIsComplete(profile: RecruiterProfile | null): boolean {
    return isRecruiterProfileComplete(profile);
  }

  toRecruiterInfo(profile: RecruiterProfile | null): RecruiterInfo | null {
    if (!this.profileIsComplete(profile) || !profile) {
      return null;
    }
    return {
      name: profile.name,
      role: profile.role,
      company: profile.company,
    };
  }

  async searchCandidatesPage(
    searchText: string,
    pageSize = INTERV_LIST_PAGE_SIZE,
    cursor: QueryDocumentSnapshot | null = null,
    interviews: RecruiterInterviewSummary[] = [],
  ): Promise<CandidateSearchPage> {
    const constraints = [
      where('isPublished', '==', true),
      orderBy('name'),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(pageSize + 1),
    ];
    const snap = await getDocs(
      query(collection(this.firestore, 'profiles'), ...constraints),
    );
    const hasMore = snap.docs.length > pageSize;
    const pageDocs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
    const needle = searchText.trim().toLowerCase();

    const candidates = pageDocs
      .map((docSnap) => {
        const data = docSnap.data() as Profile;
        return {
          id: docSnap.id,
          name: data.name ?? '',
          title: data.title ?? '',
          photo: data.photo ?? '',
          summary: data.summary ?? '',
          skills: data.skills ?? [],
          latestInterview: null,
        } satisfies CandidateSearchResult;
      })
      .filter((candidate) => {
        if (!needle) {
          return true;
        }
        const haystack = [
          candidate.name,
          candidate.title,
          candidate.summary,
          ...candidate.skills,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      });

    return {
      items: this.enrichCandidatesWithInterviews(candidates, interviews),
      nextCursor: pageDocs.length ? pageDocs[pageDocs.length - 1] : null,
      hasMore,
    };
  }

  async searchPublishedCandidates(
    searchText: string,
  ): Promise<CandidateSearchResult[]> {
    const page = await this.searchCandidatesPage(searchText, 80, null);
    return page.items;
  }

  indexInterviewsByCandidate(
    interviews: RecruiterInterviewSummary[],
  ): Record<string, RecruiterInterviewSummary> {
    const map: Record<string, RecruiterInterviewSummary> = {};
    for (const interview of interviews) {
      if (interview.hiddenFromRecruiter) {
        continue;
      }
      const key = interview.candidateProfileId;
      if (!key) {
        continue;
      }
      const existing = map[key];
      if (!existing || interview.createdAt > existing.createdAt) {
        map[key] = interview;
      }
    }
    return map;
  }

  enrichCandidatesWithInterviews(
    candidates: CandidateSearchResult[],
    interviews: RecruiterInterviewSummary[],
  ): CandidateSearchResult[] {
    const byCandidate = this.indexInterviewsByCandidate(interviews);
    return candidates.map((candidate) => ({
      ...candidate,
      latestInterview: byCandidate[candidate.id] ?? null,
    }));
  }

  async getInterviewsPage(
    pageSize = INTERV_LIST_PAGE_SIZE,
    cursor: QueryDocumentSnapshot | null = null,
  ): Promise<RecruiterInterviewPage> {
    const recruiterUid = this.recruiterId();
    if (!recruiterUid) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const ref = collection(
      this.firestore,
      'recruiters',
      recruiterUid,
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

    return {
      items: pageDocs
        .filter(
          (docSnap) =>
            !isHiddenFromAudience(
              (docSnap.data() as InterviewDoc).hidden,
              'recruiter',
            ),
        )
        .map((docSnap) =>
          this.mapRecruiterInterviewDoc(
            docSnap.id,
            docSnap.data() as InterviewDoc & { candidateProfileId?: string },
          ),
        ),
      nextCursor: pageDocs.length ? pageDocs[pageDocs.length - 1] : null,
      hasMore,
    };
  }

  async getInterviewStats(): Promise<RecruiterInterviewStats> {
    const interviews = (await this.getInterviews()).filter(
      (interview) => !interview.hiddenFromRecruiter,
    );
    return {
      total: interviews.length,
      completed: interviews.filter((i) => i.status === 'complete').length,
    };
  }

  async getInterviews(): Promise<RecruiterInterviewSummary[]> {
    const recruiterUid = this.recruiterId();
    if (!recruiterUid) {
      return [];
    }

    const snap = await getDocs(
      query(
        collection(this.firestore, 'recruiters', recruiterUid, 'interviews'),
        orderBy('createdAt', 'desc'),
      ),
    );

    return snap.docs
      .filter(
        (docSnap) =>
          !isHiddenFromAudience(
            (docSnap.data() as InterviewDoc).hidden,
            'recruiter',
          ),
      )
      .map((docSnap) =>
        this.mapRecruiterInterviewDoc(
          docSnap.id,
          docSnap.data() as InterviewDoc & { candidateProfileId?: string },
        ),
      );
  }

  async hideInterviewForRecruiter(
    candidateProfileId: string,
    interviewId: string,
  ): Promise<void> {
    const recruiterUid = this.recruiterId();
    if (!recruiterUid) {
      throw new Error('You must be signed in to remove an interview.');
    }

    await updateDoc(
      doc(
        this.firestore,
        'profiles',
        candidateProfileId,
        'interviews',
        interviewId,
      ),
      { hidden: arrayUnion('recruiter') },
    );

    await setDoc(
      doc(this.firestore, 'recruiters', recruiterUid, 'interviews', interviewId),
      { hidden: arrayUnion('recruiter') },
      { merge: true },
    );
  }

  private mapRecruiterInterviewDoc(
    id: string,
    data: InterviewDoc & { candidateProfileId?: string },
  ): RecruiterInterviewSummary {
    const feedback = data.feedback ?? null;
    const profileId = data.candidateProfileId ?? data.profileId ?? '';

    return {
      id,
      candidateProfileId: profileId,
      candidateName: data.candidateName ?? 'Candidate',
      candidateTitle: data.candidateTitle ?? '',
      status: data.status ?? 'in_progress',
      feedbackScore: this.parseFeedbackScore(feedback),
      feedbackText: feedback?.text?.trim() ? feedback.text.trim() : null,
      aiSummary: data.aiSummary ?? null,
      messageCount: data.messageCount ?? 0,
      hiddenFromRecruiter: isHiddenFromAudience(data.hidden, 'recruiter'),
      createdAt: data.createdAt?.toDate() ?? new Date(),
      completedAt: data.completedAt?.toDate() ?? null,
    };
  }

  private parseFeedbackScore(
    feedback: { score?: unknown } | null | undefined,
  ): number | null {
    if (!feedback || feedback.score === undefined || feedback.score === null) {
      return null;
    }
    const score = Number(feedback.score);
    if (!Number.isFinite(score)) {
      return null;
    }
    return Math.min(10, Math.max(1, Math.round(score)));
  }

  async getInterviewMessages(
    candidateProfileId: string,
    interviewId: string,
  ): Promise<RecruiterTranscriptMessage[]> {
    const ref = doc(
      this.firestore,
      'profiles',
      candidateProfileId,
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
