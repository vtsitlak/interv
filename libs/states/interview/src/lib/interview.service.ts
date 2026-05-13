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
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { WS_URL } from '@interv/util';
import {
  ASSISTANT_STREAM_DONE_SIGNAL,
  BACKEND_PROFILE_NOT_FOUND,
  ChatMessage,
  INTERVIEW_COMPLETE_SIGNAL,
  RecruiterInfo,
} from './interview.models';

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
        `Firestore permission denied on ${pathHint}. Publish the rules in this repo (firestore.rules): run npm run deploy:firestore:rules, or paste them in Firebase Console → Firestore → Rules. Signed-in users must be allowed to create documents there.`,
      );
    }
    if (code === 'unauthenticated') {
      return new Error(
        `Not signed in to Firebase (${pathHint}). Use /login with Google, then open this interview link again.`,
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
              `No profile document at ${pathHint} yet. Go to /profile/edit, fill the form, and click Save & train AI once (wait for success). Then open your interview link again.`,
            );
          }
          throw new Error(
            `No profile at ${pathHint}. The candidate (${profileId}) must sign in and complete Save & train AI on /profile/edit before anyone can interview them. If you are testing yourself, use the same Google account for both profile and interview.`,
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
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }

  async createInterview(
    profileId: string,
    recruiterInfo: RecruiterInfo,
  ): Promise<string> {
    const pathHint = `profiles/${profileId}/interviews`;
    const fs = this.firestore;
    try {
      return await this.runFirestore(async () => {
        const ref = collection(fs, 'profiles', profileId, 'interviews');
        const docRef = await addDoc(ref, {
          profileId,
          recruiterName: recruiterInfo.name,
          recruiterRole: recruiterInfo.role,
          recruiterCompany: recruiterInfo.company,
          messages: [],
          status: 'in_progress',
          feedback: null,
          recruiterMessageCount: 0,
          maxMessages: 8,
          createdAt: serverTimestamp(),
          completedAt: null,
        });
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
      if (event.data === BACKEND_PROFILE_NOT_FOUND) {
        onError(
          'The API could not load this candidate’s profile from Firestore. Confirm profiles/{uid} exists (candidate saved /profile/edit) and that Railway uses the same Firebase project.',
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

  async completeInterview(
    profileId: string,
    interviewId: string,
  ): Promise<void> {
    const pathHint = `profiles/${profileId}/interviews/${interviewId}`;
    const fs = this.firestore;
    try {
      await this.runFirestore(async () => {
        const ref = doc(fs, 'profiles', profileId, 'interviews', interviewId);
        await updateDoc(ref, {
          status: 'complete',
          completedAt: serverTimestamp(),
        });
      });
    } catch (e: unknown) {
      throw this.mapFirestoreWriteError(e, pathHint);
    }
  }
}