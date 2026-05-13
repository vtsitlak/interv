import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  addDoc,
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { WS_URL } from '@interv/util';
import {
  ASSISTANT_STREAM_DONE_SIGNAL,
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
  private readonly wsUrl = inject(WS_URL);
  private socket: WebSocket | null = null;

  /** Firestore calls invoked from clicks / websocket must run inside an injection context. */
  private runFirestore<T>(op: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, () => op());
  }

  async createInterview(
    profileId: string,
    recruiterInfo: RecruiterInfo,
  ): Promise<string> {
    const fs = this.firestore;
    return this.runFirestore(async () => {
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
    const fs = this.firestore;
    await this.runFirestore(async () => {
      const ref = doc(fs, 'profiles', profileId, 'interviews', interviewId);
      await updateDoc(ref, {
        messages: arrayUnion({
          role: message.role,
          content: message.content,
          timestamp: serverTimestamp(),
        }),
      });
    });
  }

  async completeInterview(
    profileId: string,
    interviewId: string,
  ): Promise<void> {
    const fs = this.firestore;
    await this.runFirestore(async () => {
      const ref = doc(fs, 'profiles', profileId, 'interviews', interviewId);
      await updateDoc(ref, {
        status: 'complete',
        completedAt: serverTimestamp(),
      });
    });
  }
}
