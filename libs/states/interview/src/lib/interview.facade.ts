import { inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { InterviewService } from './interview.service';
import { InterviewStore } from './interview.store';
import type { RecruiterInfo } from './interview.models';

@Injectable({ providedIn: 'root' })
export class InterviewFacade {
  private readonly store = inject(InterviewStore);
  private readonly service = inject(InterviewService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

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

    try {
      const interviewId = await this.service.createInterview(
        profileId,
        recruiterInfo,
      );

      // Only after Firestore succeeds: wait up to this long for WebSocket open.
      startupWatchdogId = setTimeout(() => {
        this.ngZone.run(() => {
          if (!this.store.isConnecting()) return;
          this.service.disconnect();
          this.store.setError(
            'Could not connect to the live assistant in time. Run the backend (npm run start:backend) and verify wsUrl in environment.ts (e.g. ws://127.0.0.1:8000).',
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
              this.store.setConnecting(false);
              this.store.setWsReady(true);
            }),
          () => this.ngZone.run(() => this.store.finishStreaming()),
          () =>
            this.ngZone.run(() => {
              this.store.setWsReady(false);
              this.store.setConnecting(false);
              clearStartupWatchdog();
              const err = this.store.error();
              if (!socketOpenedSuccessfully && err === null) {
                this.store.setError(
                  'Cannot reach chat server (WebSocket). Start the backend and check wsUrl (dev: ws://127.0.0.1:8000).',
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
