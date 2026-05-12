import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { InterviewService } from './interview.service';
import { InterviewStore } from './interview.store';
import type { RecruiterInfo } from './interview.models';

@Injectable({ providedIn: 'root' })
export class InterviewFacade {
  private readonly store = inject(InterviewStore);
  private readonly service = inject(InterviewService);
  private readonly router = inject(Router);

  readonly messages = this.store.messages;
  readonly isStreaming = this.store.isStreaming;
  readonly isComplete = this.store.isComplete;
  readonly isConnecting = this.store.isConnecting;
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
      const interviewId = await this.service.createInterview(
        profileId,
        recruiterInfo,
      );
      this.store.setSession(profileId, interviewId, recruiterInfo);

      this.service.connect(
        profileId,
        interviewId,
        (chunk) => {
          const messages = this.store.messages();
          const last = messages[messages.length - 1];
          if (!last || last.role !== 'assistant') {
            this.store.startAssistantMessage();
          }
          this.store.appendToLastMessage(chunk);
        },
        async () => {
          this.store.finishStreaming();
          this.store.setComplete();
          await this.service.completeInterview(profileId, interviewId);
          await this.router.navigate(['/p', profileId, 'feedback'], {
            queryParams: { interviewId },
          });
        },
        (error) => this.store.setError(error),
        () => this.store.setConnecting(false),
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.store.setError(message);
    }
  }

  async sendMessage(content: string): Promise<void> {
    if (!this.store.canSendMessage()) return;

    const profileId = this.store.profileId();
    const interviewId = this.store.interviewId();
    if (!profileId || !interviewId) return;

    const message = this.store.addUserMessage(content);
    await this.service.saveMessage(profileId, interviewId, message);
    this.service.send(content);
  }

  disconnect(): void {
    this.service.disconnect();
    this.store.reset();
  }
}
