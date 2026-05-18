import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  ChatMessage,
  INITIAL_INTERVIEW_STATE,
  type InterviewNavigationContext,
  type InterviewState,
  type RecruiterInfo,
} from './interview.models';

export const InterviewStore = signalStore(
  { providedIn: 'root' },
  withState<InterviewState>(INITIAL_INTERVIEW_STATE),
  withComputed((store) => ({
    canSendMessage: computed(
      () =>
        store.wsReady() &&
        !store.isStreaming() &&
        !store.isComplete() &&
        store.messageCount() < store.maxMessages(),
    ),
    lastMessage: computed(() => {
      const msgs = store.messages();
      return msgs.length ? msgs[msgs.length - 1] : null;
    }),
  })),
  withMethods((store) => ({
    setSession(
      profileId: string,
      interviewId: string,
      recruiterInfo: RecruiterInfo,
      navigation?: InterviewNavigationContext | null,
    ): void {
      patchState(store, {
        profileId,
        interviewId,
        recruiterInfo,
        navigation: navigation ?? null,
      });
    },

    setConnecting(isConnecting: boolean): void {
      patchState(store, { isConnecting });
    },

    setWsReady(ready: boolean): void {
      patchState(store, { wsReady: ready });
    },

    addUserMessage(content: string): ChatMessage {
      const message: ChatMessage = {
        role: 'user',
        content,
        timestamp: new Date(),
      };
      patchState(store, {
        messages: [...store.messages(), message],
        messageCount: store.messageCount() + 1,
        isStreaming: true,
      });
      return message;
    },

    undoLastPendingUserTurn(): void {
      const msgs = [...store.messages()];
      const last = msgs[msgs.length - 1];
      if (last?.role !== 'user') return;
      msgs.pop();
      patchState(store, {
        messages: msgs,
        messageCount: Math.max(0, store.messageCount() - 1),
        isStreaming: false,
      });
    },

    startAssistantMessage(): void {
      const message: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      patchState(store, { messages: [...store.messages(), message] });
    },

    appendToLastMessage(chunk: string): void {
      const messages = [...store.messages()];
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant') {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + chunk,
        };
        patchState(store, { messages });
      }
    },

    finishStreaming(): void {
      patchState(store, { isStreaming: false });
    },

    setComplete(): void {
      patchState(store, { isComplete: true, isStreaming: false });
    },

    setError(error: string): void {
      patchState(store, { error, isStreaming: false, isConnecting: false });
    },

    clearError(): void {
      patchState(store, { error: null });
    },

    showConfirmation(): void {
      patchState(store, { showEndConfirmation: true });
    },

    hideConfirmation(): void {
      patchState(store, { showEndConfirmation: false });
    },

    resumeInterview(): void {
      patchState(store, { isComplete: false });
    },

    setMaxMessages(maxMessages: number): void {
      patchState(store, { maxMessages });
    },

    reset(): void {
      patchState(store, { ...INITIAL_INTERVIEW_STATE });
    },
  })),
);
