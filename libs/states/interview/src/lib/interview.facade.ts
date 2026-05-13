import { inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { WS_URL } from '@interv/util';
import { InterviewService, type WsCloseMeta } from './interview.service';
import { InterviewStore } from './interview.store';
import type { RecruiterInfo } from './interview.models';

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

    let startupWatchdogId: ReturnType<typeof setTimeout> | undefined;
    const clearStartupWatchdog = (): void => {
      if (startupWatchdogId !== undefined) {
        clearTimeout(startupWatchdogId);
        startupWatchdogId = undefined;
      }
    };

    const CREATE_INTERVIEW_DEADLINE_MS = 30_000;

    try {
      const interviewId = await Promise.race([
        this.service.createInterview(profileId, recruiterInfo),
        new Promise<string>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Firestore did not respond while creating the interview. Sign in (recruiter), deploy firestore.rules (firebase deploy --only firestore:rules), then check Rules allow auth users to create profiles/{profileId}/interviews.',
                ),
              ),
            CREATE_INTERVIEW_DEADLINE_MS,
          ),
        ),
      ]);

      // Spinner on "Start interview" only covers Firestore; stop it before WS (which can lag).
      this.ngZone.run(() => {
        this.store.setConnecting(false);
      });

      // After Firestore: wait up to this long for WebSocket open (wsReady).
      const wsAttemptUrl = `${this.wsUrlEnv.replace(/\/$/, '')}/chat/${profileId}/${interviewId}`;
      startupWatchdogId = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.store.wsReady()) return;
          this.service.disconnect();
          this.store.setError(
            `No answer from assistant at ${wsAttemptUrl} after 20s. Run npm run start:backend and use wsUrl that matches where uvicorn listens (dev: ws://127.0.0.1:8000).`,
          );
        });
      }, 20_000);

      let socketOpenedSuccessfully = false;

      // Keep store + websocket setup on the Angular zone so OnPush/sync updates run.
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
              clearStartupWatchdog();
              this.store.setError(error);
            }),
          () =>
            this.ngZone.run(() => {
              socketOpenedSuccessfully = true;
              clearStartupWatchdog();
              this.store.setWsReady(true);
            }),
          () => this.ngZone.run(() => this.store.finishStreaming()),
          (meta: WsCloseMeta) =>
            this.ngZone.run(() => {
              this.store.setWsReady(false);
              clearStartupWatchdog();
              const err = this.store.error();
              if (!socketOpenedSuccessfully && err === null) {
                const base = this.wsUrlEnv.replace(/\/$/, '');
                const tried = `${base}/chat/${profileId}/${interviewId}`;
                const codeHint =
                  meta.code === 1006
                    ? ' (no handshake — wrong host/port, or server not running)'
                    : ` (close code ${meta.code}${meta.reason ? `: ${meta.reason}` : ''})`;
                this.store.setError(
                  `WebSocket failed: ${tried}${codeHint}. Dev: match wsUrl to uvicorn (--host 127.0.0.1 → use ws://127.0.0.1:8000, not localhost).`,
                );
              }
            }),
        );
      });
    } catch (e: unknown) {
      clearStartupWatchdog();
      const message = e instanceof Error ? e.message : String(e);
      this.ngZone.run(() => this.store.setError(message));
      throw e;
    }
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
