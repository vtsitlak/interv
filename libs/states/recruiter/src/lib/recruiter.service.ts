import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  collection,
  collectionGroup,
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
} from '@angular/fire/firestore';
import type { Profile } from '@interv/models';
import type { RecruiterInfo } from '@interv/state-interview';
import type {
  CandidateSearchResult,
  RecruiterInterviewSummary,
  RecruiterProfile,
  RecruiterTranscriptMessage,
} from './recruiter.models';
import { isRecruiterProfileComplete } from './recruiter.models';

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

  async searchPublishedCandidates(
    searchText: string,
  ): Promise<CandidateSearchResult[]> {
    const q = query(
      collection(this.firestore, 'profiles'),
      where('isPublished', '==', true),
      limit(80),
    );
    const snap = await getDocs(q);
    const needle = searchText.trim().toLowerCase();

    const results = snap.docs
      .map((docSnap) => {
        const data = docSnap.data() as Profile;
        return {
          id: docSnap.id,
          name: data.name ?? '',
          title: data.title ?? '',
          photo: data.photo ?? '',
          summary: data.summary ?? '',
          skills: data.skills ?? [],
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

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getInterviews(): Promise<RecruiterInterviewSummary[]> {
    const recruiterUid = this.recruiterId();
    if (!recruiterUid) {
      return [];
    }

    const q = query(
      collectionGroup(this.firestore, 'interviews'),
      where('recruiterUid', '==', recruiterUid),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => {
      const data = docSnap.data() as InterviewDoc;
      const feedback = data.feedback ?? null;
      const profileId =
        data.profileId ??
        docSnap.ref.parent.parent?.id ??
        '';

      return {
        id: docSnap.id,
        candidateProfileId: profileId,
        candidateName: data.candidateName ?? 'Candidate',
        candidateTitle: data.candidateTitle ?? '',
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
