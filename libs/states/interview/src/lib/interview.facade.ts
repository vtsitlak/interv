import { inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { WS_URL } from '@interv/util';
import { InterviewService, type WsCloseMeta } from './interview.service';
import { InterviewStore } from './interview.store';
import type { RecruiterInfo } from './interview.models';

const CREATE_INTERVIEW_DEADLINE_MS = 30_000;
const WS_OPEN_DEADLINE_MS = 20_000;

@Injectable({ providedIn: 'root' })
export class InterviewFacade {
  private readonly store = inject(InterviewStore);
  private readonly service = inject(InterviewService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly wsUrlEnv = inject(WS_URL);

  readonly messages = this.store.messages;
  readonly isStreaming = this.store.isStreaming;
  readonly isComplete = this.store.isComplete;
  readonly isConnecting = this.store.isConnecting;
  readonly wsReady = this.store.wsReady;
  readonly canSendMessage = this.store.canSendMessage;
  readonly messageCount = this.store.messageCount;
  readonly maxMessages = this.store.maxMessages;
  readonly error = this.store.error;

  async startInterview(
    profileId: string,
    recruiterInfo: RecruiterInfo,
  ): Promise<void> {
    this.store.setConnecting(true);
    this.store.clearError();

    try {
      await this.service.assertCandidateProfileExists(profileId);
      const interviewId = await Promise.race([
        this.service.createInterview(profileId, recruiterInfo),
        new Promise<string>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Firestore did not create the interview in time. In Firebase Console: (1) Build → Firestore Database → confirm a Native (not Datastore-only) database exists for project interv-c6366. (2) Publish rules from this repo (npm run deploy:firestore:rules). (3) Check DevTools → Network is not blocking firestore.googleapis.com.',
                ),
              ),
            CREATE_INTERVIEW_DEADLINE_MS,
          ),
        ),
      ]);

      this.ngZone.run(() => {
        this.store.setConnecting(false);
      });

      await this.connectWebSocket(profileId, interviewId, recruiterInfo);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.ngZone.run(() => {
        this.store.setConnecting(false);
        this.store.setWsReady(false);
        this.store.setError(message);
      });
      throw e;
    }
  }

  private connectWebSocket(
    profileId: string,
    interviewId: string,
    recruiterInfo: RecruiterInfo,
  ): Promise<void> {
    const wsAttemptUrl = `${this.wsUrlEnv.replace(/\/$/, '')}/chat/${profileId}/${interviewId}`;

    return new Promise((resolve, reject) => {
      let socketOpenedSuccessfully = false;
      let settled = false;

      const fail = (message: string): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        this.service.disconnect();
        this.ngZone.run(() => {
          this.store.setWsReady(false);
          reject(new Error(message));
        });
      };

      const succeed = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        this.ngZone.run(() => {
          this.store.setWsReady(true);
          resolve();
        });
      };

      const timeoutId = setTimeout(() => {
        if (!socketOpenedSuccessfully) {
          fail(
            `Could not connect to ${wsAttemptUrl} after ${WS_OPEN_DEADLINE_MS / 1000}s. ` +
              'Check that the API is running and wsUrl matches your backend (local: ws://127.0.0.1:8000, prod: wss://your-railway-host).',
          );
        }
      }, WS_OPEN_DEADLINE_MS);

      this.ngZone.run(() => {
        this.store.setSession(profileId, interviewId, recruiterInfo);
        this.store.setWsReady(false);

        this.service.connect(
          profileId,
          interviewId,
          (chunk) =>
            this.ngZone.run(() => {
              const messages = this.store.messages();
              const last = messages[messages.length - 1];
              if (!last || last.role !== 'assistant') {
                this.store.startAssistantMessage();
              }
              this.store.appendToLastMessage(chunk);
            }),
          async () =>
            this.ngZone.run(async () => {
              this.store.finishStreaming();
              this.store.setComplete();
              await this.service.completeInterview(profileId, interviewId);
              await this.router.navigate(['/p', profileId, 'feedback'], {
                queryParams: { interviewId },
              });
            }),
          (error) =>
            this.ngZone.run(() => {
              if (!socketOpenedSuccessfully) {
                fail(
                  error === 'Connection error'
                    ? `Connection error reaching ${wsAttemptUrl}. Is the backend running and reachable?`
                    : error,
                );
                return;
              }
              this.store.setError(error);
            }),
          () =>
            this.ngZone.run(() => {
              socketOpenedSuccessfully = true;
              succeed();
            }),
          () => this.ngZone.run(() => this.store.finishStreaming()),
          (meta: WsCloseMeta) =>
            this.ngZone.run(() => {
              if (socketOpenedSuccessfully) {
                this.store.setWsReady(false);
                return;
              }
              const codeHint =
                meta.code === 1006
                  ? ' (no handshake — API down, wrong wsUrl, or blocked by network)'
                  : ` (close code ${meta.code}${meta.reason ? `: ${meta.reason}` : ''})`;
              fail(`WebSocket failed: ${wsAttemptUrl}${codeHint}`);
            }),
        );
      });
    });
  }

  async sendMessage(content: string): Promise<void> {
    if (!this.store.canSendMessage()) return;

    const profileId = this.store.profileId();
    const interviewId = this.store.interviewId();
    if (!profileId || !interviewId) {
      this.store.setError(
        'Interview session is missing. Go back and start the interview again.',
      );
      return;
    }

    if (!this.store.wsReady()) {
      this.store.setError(
        'Still connecting to the chat server. Wait a moment and try again.',
      );
      return;
    }

    const message = this.store.addUserMessage(content);
    try {
      await this.service.saveMessage(profileId, interviewId, message);
    } catch (err: unknown) {
      this.store.undoLastPendingUserTurn();
      const msg = err instanceof Error ? err.message : String(err);
      this.store.setError(`Could not save message: ${msg}`);
      return;
    }

    if (!this.service.send(content)) {
      this.store.finishStreaming();
      this.store.setError(
        'Could not send on the live connection. Refresh the page and try again.',
      );
    }
  }

  disconnect(): void {
    this.service.disconnect();
    this.store.reset();
  }
}
