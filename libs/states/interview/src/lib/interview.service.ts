import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  Timestamp,
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { API_URL, WS_URL } from '@interv/util';
import type { Profile } from '@interv/models';
import {
  ASSISTANT_PROCESSING_SIGNAL,
  ASSISTANT_STREAM_DONE_SIGNAL,
  BACKEND_PROFILE_NOT_FOUND,
  ChatMessage,
  INTERVIEW_COMPLETE_SIGNAL,
  InterviewReview,
  RecruiterInfo,
} from './interview.models';

import {
  buildGenericFallbackQuestions,
  buildSuggestedQuestionsFromProfile,
  mergeSuggestedQuestions,
} from './suggested-questions';

/** Passed when the browser closes the WebSocket (failure codes help debug dev vs prod). */
export interface WsCloseMeta {
  readonly code: number;
  readonly reason: string;
  readonly wasClean: boolean;
}

@Injectable({ providedIn: 'root' })
export class InterviewService {
  private readonly injector = inject(Injector);
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly wsUrl = inject(WS_URL);
  private readonly apiUrl = inject(API_URL);
  private socket: WebSocket | null = null;

  /** Firestore calls invoked from clicks / websocket must run inside an injection context. */
  private runFirestore<T>(op: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, () => op());
  }

  private mapFirestoreWriteError(err: unknown, pathHint: string): Error {
    const code =
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      typeof (err as { code: unknown }).code === 'string'
        ? (err as { code: string }).code
        : null;
    const message =
      err !== null &&
      typeof err === 'object' &&
      'message' in err &&
      typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : err instanceof Error
          ? err.message
          : String(err);

    if (code === 'permission-denied') {
      return new Error(
        `Firestore permission denied on ${pathHint}. Deploy firestore.rules (npm run deploy:firestore:rules). The candidate must have saved their profile; only published profiles accept interview sessions.`,
      );
    }
    if (code === 'unauthenticated') {
      return new Error(
        `Firestore denied access on ${pathHint}. Deploy the latest firestore.rules (npm run deploy:firestore:rules) so published profiles allow public interviews.`,
      );
    }
    if (code) {
      return new Error(`Firestore (${code}): ${message}`);
    }
    return err instanceof Error ? err : new Error(message);
  }

  /**
   * Ensures `profiles/{profileId}` exists (candidate must have saved their profile).
   * Call before `createInterview` so we do not create orphan interview docs.
   */
  async assertCandidateProfileExists(profileId: string): Promise<void> {
    const pathHint = `profiles/${profileId}`;
    const fs = this.firestore;
    try {
      await this.runFirestore(async () => {
        const d = doc(fs, 'profiles', profileId);
        let snap = await getDoc(d);
        if (
          !snap.exists() &&
          this.auth.currentUser?.uid === profileId
        ) {
          try {
            snap = await getDocFromServer(d);
          } catch {
            /* keep local snap */
          }
        }
        if (!snap.exists()) {
          const uid = this.auth.currentUser?.uid ?? null;
          if (uid === profileId) {
            throw new Error(
              `No profile document at ${pathHint} yet. Go to /candidate/train-profile, fill the form, and click Save & train AI once (wait for success). Then open your interview link again.`,
            );
          }
          throw new Error(
            `No profile at ${pathHint}. The candidate must sign in, complete their profile at /candidate/train-profile, and click Save & train AI before anyone can start an interview.`,
          );
        }
      });
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        (e.message.startsWith('No profile at') ||
          e.message.startsWith('No profile document at'))
      ) {
        throw e;
      }
      const code =
        e !== null &&
        typeof e === 'object' &&
        'code' in e &&
        typeof (e as { code: unknown }).code === 'string'
          ? (e as { code: string }).code
          : null;
      if (code === 'permission-denied') {
        throw new Error(
          `No published profile at ${pathHint}. The candidate must save their profile at /candidate/train-profile before interviews can start.`,
        );
      }
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }

  async createInterview(
    profileId: string,
    recruiterInfo: RecruiterInfo,
    options?: { recruiterUid?: string },
  ): Promise<string> {
    const pathHint = `profiles/${profileId}/interviews`;
    const fs = this.firestore;
    try {
      return await this.runFirestore(async () => {
        let candidateName = '';
        let candidateTitle = '';
        const profileSnap = await getDoc(doc(fs, 'profiles', profileId));
        if (profileSnap.exists()) {
          const profileData = profileSnap.data() as Profile;
          candidateName = profileData.name ?? '';
          candidateTitle = profileData.title ?? '';
        }

        const ref = collection(fs, 'profiles', profileId, 'interviews');
        const recruiterUid = options?.recruiterUid ?? null;
        const docRef = await addDoc(ref, {
          profileId,
          recruiterName: recruiterInfo.name,
          recruiterRole: recruiterInfo.role,
          recruiterCompany: recruiterInfo.company,
          recruiterUid,
          candidateName,
          candidateTitle,
          messages: [],
          status: 'in_progress',
          feedback: null,
          recruiterMessageCount: 0,
          maxMessages: 8,
          createdAt: serverTimestamp(),
          completedAt: null,
        });

        if (recruiterUid) {
          await setDoc(
            doc(fs, 'recruiters', recruiterUid, 'interviews', docRef.id),
            {
              profileId,
              candidateProfileId: profileId,
              candidateName,
              candidateTitle,
              recruiterName: recruiterInfo.name,
              recruiterRole: recruiterInfo.role,
              recruiterCompany: recruiterInfo.company,
              status: 'in_progress',
              feedback: null,
              aiSummary: null,
              messageCount: 0,
              createdAt: serverTimestamp(),
              completedAt: null,
            },
          );
        }

        return docRef.id;
      });
    } catch (e: unknown) {
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }

  connect(
    profileId: string,
    interviewId: string,
    onMessage: (text: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onOpen: () => void,
    onAssistantTurnDone: () => void,
    onConnectionClosed: (meta: WsCloseMeta) => void,
  ): void {
    this.disconnect();
    const base = this.wsUrl.replace(/\/$/, '');
    const url = `${base}/chat/${profileId}/${interviewId}`;
    const ws = new WebSocket(url);
    this.socket = ws;

    ws.onopen = () => onOpen();

    ws.onmessage = (event) => {
      if (event.data === INTERVIEW_COMPLETE_SIGNAL) {
        onComplete();
        return;
      }
      if (event.data === ASSISTANT_STREAM_DONE_SIGNAL) {
        onAssistantTurnDone();
        return;
      }
      if (event.data === ASSISTANT_PROCESSING_SIGNAL) {
        return;
      }
      if (event.data === BACKEND_PROFILE_NOT_FOUND) {
        onError(
          'The API could not load this candidate’s profile from Firestore. Confirm profiles/{uid} exists (candidate saved /candidate/train-profile) and that Railway uses the same Firebase project.',
        );
        return;
      }
      onMessage(event.data);
    };

    ws.onerror = () => onError('Connection error');
    ws.onclose = (ev: CloseEvent) => {
      if (this.socket === ws) {
        this.socket = null;
      }
      onConnectionClosed({
        code: ev.code,
        reason: typeof ev.reason === 'string' ? ev.reason : '',
        wasClean: ev.wasClean,
      });
    };
  }

  send(message: string): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message);
      return true;
    }
    return false;
  }

  disconnect(): void {
    const s = this.socket;
    if (s) {
      s.onopen = null;
      s.onmessage = null;
      s.onerror = null;
      s.onclose = null;
      s.close();
    }
    this.socket = null;
  }

  async saveMessage(
    profileId: string,
    interviewId: string,
    message: ChatMessage,
  ): Promise<void> {
    const pathHint = `profiles/${profileId}/interviews/${interviewId}`;
    const fs = this.firestore;
    try {
      await this.runFirestore(async () => {
        const ref = doc(fs, 'profiles', profileId, 'interviews', interviewId);
        await updateDoc(ref, {
          messages: arrayUnion({
            role: message.role,
            content: message.content,
            timestamp: Timestamp.fromDate(message.timestamp),
          }),
        });
      });
    } catch (e: unknown) {
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }

  async submitFeedback(
    profileId: string,
    interviewId: string,
    score: number,
    text: string,
    options?: { requestContact?: boolean; recruiterEmail?: string | null },
  ): Promise<void> {
    const pathHint = `profiles/${profileId}/interviews/${interviewId}`;
    const fs = this.firestore;
    const requestContact = options?.requestContact === true;
    const recruiterEmail =
      requestContact && options?.recruiterEmail?.trim()
        ? options.recruiterEmail.trim()
        : null;

    try {
      await this.runFirestore(async () => {
        const ref = doc(fs, 'profiles', profileId, 'interviews', interviewId);
        await updateDoc(ref, {
          feedback: {
            score,
            text,
            submittedAt: serverTimestamp(),
            requestContact,
            recruiterEmail,
          },
        });

        const snap = await getDoc(ref);
        const recruiterUid = snap.data()?.['recruiterUid'] as string | null | undefined;
        if (recruiterUid) {
          await setDoc(
            doc(fs, 'recruiters', recruiterUid, 'interviews', interviewId),
            {
              feedback: {
                score,
                text,
                submittedAt: serverTimestamp(),
                requestContact,
                recruiterEmail,
              },
            },
            { merge: true },
          );
        }
      });
    } catch (e: unknown) {
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }

  async getPublicProfile(profileId: string): Promise<Profile | null> {
    const snap = await getDoc(doc(this.firestore, 'profiles', profileId));
    return snap.exists() ? (snap.data() as Profile) : null;
  }

  async listInterviewsForProfile(profileId: string): Promise<InterviewReview[]> {
    const pathHint = `profiles/${profileId}/interviews`;
    const fs = this.firestore;
    try {
      return await this.runFirestore(async () => {
        const ref = collection(fs, 'profiles', profileId, 'interviews');
        const q = query(ref, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map((docSnap) =>
          this.mapInterviewReview(profileId, docSnap.id, docSnap.data()),
        );
      });
    } catch (e: unknown) {
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }

  async getInterviewForReview(
    profileId: string,
    interviewId: string,
  ): Promise<InterviewReview | null> {
    const pathHint = `profiles/${profileId}/interviews/${interviewId}`;
    const fs = this.firestore;
    try {
      return await this.runFirestore(async () => {
        const ref = doc(fs, 'profiles', profileId, 'interviews', interviewId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          return null;
        }
        return this.mapInterviewReview(profileId, snap.id, snap.data());
      });
    } catch (e: unknown) {
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }

  async getLatestInterviewWithFeedback(
    profileId: string,
  ): Promise<InterviewReview | null> {
    const interviews = await this.listInterviewsForProfile(profileId);
    return (
      interviews.find((item) => item.feedbackScore !== null && item.feedbackText) ??
      null
    );
  }

  private mapInterviewReview(
    profileId: string,
    id: string,
    data: Record<string, unknown>,
  ): InterviewReview {
    const feedback = data['feedback'] as
      | {
          score?: number;
          text?: string;
          requestContact?: boolean;
          recruiterEmail?: string | null;
        }
      | null
      | undefined;
    const createdAt = data['createdAt'] as Timestamp | undefined;
    const completedAt = data['completedAt'] as Timestamp | undefined | null;
    const status = data['status'] === 'complete' ? 'complete' : 'in_progress';
    const requestContact = feedback?.requestContact === true;
    const recruiterContactEmail =
      requestContact && feedback?.recruiterEmail?.trim()
        ? feedback.recruiterEmail.trim()
        : null;

    return {
      id,
      profileId,
      recruiterName: String(data['recruiterName'] ?? ''),
      recruiterRole: String(data['recruiterRole'] ?? ''),
      recruiterCompany: String(data['recruiterCompany'] ?? ''),
      status,
      feedbackScore:
        typeof feedback?.score === 'number' ? feedback.score : null,
      feedbackText: feedback?.text?.trim() ? feedback.text.trim() : null,
      requestContact,
      recruiterContactEmail,
      aiSummary:
        typeof data['aiSummary'] === 'string' && data['aiSummary'].trim()
          ? data['aiSummary'].trim()
          : null,
      createdAt: createdAt?.toDate() ?? new Date(),
      completedAt: completedAt?.toDate() ?? null,
    };
  }

  async getInterviewMessages(
    profileId: string,
    interviewId: string,
  ): Promise<ChatMessage[]> {
    const pathHint = `profiles/${profileId}/interviews/${interviewId}`;
    const fs = this.firestore;
    try {
      return await this.runFirestore(async () => {
        const ref = doc(fs, 'profiles', profileId, 'interviews', interviewId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          return [];
        }
        const data = snap.data() as {
          messages?: {
            role?: string;
            content?: string;
            timestamp?: Timestamp;
          }[];
        };
        return (data.messages ?? []).map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content ?? '',
          timestamp: message.timestamp?.toDate() ?? new Date(),
        }));
      });
    } catch (e: unknown) {
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }

  async getSuggestedQuestions(profileId: string): Promise<string[]> {
    const profile = await this.getPublicProfile(profileId);
    const context = profile ?? {
      name: 'the candidate',
      title: '',
    };

    const fromApi = await this.fetchSuggestedQuestionsFromApi(profileId);
    const fromProfile = profile
      ? buildSuggestedQuestionsFromProfile(profile)
      : [];

    const merged = mergeSuggestedQuestions(
      [fromApi, fromProfile],
      context,
      5,
    );

    if (merged.length > 0) {
      return merged;
    }

    return buildGenericFallbackQuestions(context, 5);
  }

  private async fetchSuggestedQuestionsFromApi(
    profileId: string,
  ): Promise<string[]> {
    const url = `${this.apiUrl}/profiles/${profileId}/suggested-questions`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as { questions?: string[] };
      return (data.questions ?? []).map((q) => q.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  async requestInterviewSummary(
    profileId: string,
    interviewId: string,
  ): Promise<void> {
    const url = `${this.apiUrl}/interviews/${profileId}/${interviewId}/summarize`;
    try {
      await fetch(url, { method: 'POST' });
    } catch {
      /* non-blocking */
    }
  }

  async extendMessageLimit(
    profileId: string,
    interviewId: string,
    maxMessages: number,
  ): Promise<void> {
    const pathHint = `profiles/${profileId}/interviews/${interviewId}`;
    const fs = this.firestore;
    try {
      await this.runFirestore(async () => {
        const ref = doc(fs, 'profiles', profileId, 'interviews', interviewId);
        await updateDoc(ref, { maxMessages });
      });
    } catch (e: unknown) {
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }

  async completeInterview(
    profileId: string,
    interviewId: string,
  ): Promise<void> {
    const pathHint = `profiles/${profileId}/interviews/${interviewId}`;
    const fs = this.firestore;
    try {
      await this.runFirestore(async () => {
        const ref = doc(fs, 'profiles', profileId, 'interviews', interviewId);
        const snap = await getDoc(ref);
        const data = snap.data() as { recruiterUid?: string | null } | undefined;
        const recruiterUid = data?.recruiterUid ?? null;

        await updateDoc(ref, {
          status: 'complete',
          completedAt: serverTimestamp(),
        });

        if (recruiterUid) {
          await setDoc(
            doc(fs, 'recruiters', recruiterUid, 'interviews', interviewId),
            {
              status: 'complete',
              completedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      });
    } catch (e: unknown) {
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }
}