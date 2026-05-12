import { inject, Injectable } from '@angular/core';
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
  ChatMessage,
  INTERVIEW_COMPLETE_SIGNAL,
  RecruiterInfo,
} from './interview.models';

@Injectable({ providedIn: 'root' })
export class InterviewService {
  private readonly firestore = inject(Firestore);
  private readonly wsUrl = inject(WS_URL);
  private socket: WebSocket | null = null;

  async createInterview(
    profileId: string,
    recruiterInfo: RecruiterInfo,
  ): Promise<string> {
    const ref = collection(
      this.firestore,
      'profiles',
      profileId,
      'interviews',
    );
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
  }

  connect(
    profileId: string,
    interviewId: string,
    onMessage: (text: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onOpen: () => void,
  ): void {
    this.disconnect();
    const base = this.wsUrl.replace(/\/$/, '');
    const url = `${base}/chat/${profileId}/${interviewId}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => onOpen();

    this.socket.onmessage = (event) => {
      if (event.data === INTERVIEW_COMPLETE_SIGNAL) {
        onComplete();
        return;
      }
      onMessage(event.data);
    };

    this.socket.onerror = () => onError('Connection error');
    this.socket.onclose = () => {
      this.socket = null;
    };
  }

  send(message: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    }
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  async saveMessage(
    profileId: string,
    interviewId: string,
    message: ChatMessage,
  ): Promise<void> {
    const ref = doc(
      this.firestore,
      'profiles',
      profileId,
      'interviews',
      interviewId,
    );
    await updateDoc(ref, {
      messages: arrayUnion({
        role: message.role,
        content: message.content,
        timestamp: serverTimestamp(),
      }),
    });
  }

  async completeInterview(
    profileId: string,
    interviewId: string,
  ): Promise<void> {
    const ref = doc(
      this.firestore,
      'profiles',
      profileId,
      'interviews',
      interviewId,
    );
    await updateDoc(ref, {
      status: 'complete',
      completedAt: serverTimestamp(),
    });
  }
}
