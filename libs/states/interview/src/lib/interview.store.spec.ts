import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { InterviewStore } from './interview.store';

describe('InterviewStore', () => {
  let store: InstanceType<typeof InterviewStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [InterviewStore] });
    store = TestBed.inject(InterviewStore);
  });

  it('canSendMessage is false when complete', () => {
    store.setSession('p1', 'i1', { name: 'A', role: 'R', company: 'C' });
    store.setWsReady(true);
    store.setComplete();
    expect(store.canSendMessage()).toBe(false);
  });

  it('resumeInterview clears complete so more messages can be sent after limit extended', () => {
    store.setSession('p1', 'i1', { name: 'A', role: 'R', company: 'C' });
    store.setWsReady(true);
    for (let i = 0; i < 8; i++) {
      store.addUserMessage(`q${i}`);
      store.finishStreaming();
    }
    store.setComplete();
    expect(store.canSendMessage()).toBe(false);

    store.resumeInterview();
    store.setMaxMessages(16);
    expect(store.isComplete()).toBe(false);
    expect(store.canSendMessage()).toBe(true);
  });

  it('addUserMessage increments messageCount and sets streaming', () => {
    store.addUserMessage('hello');
    expect(store.messageCount()).toBe(1);
    expect(store.isStreaming()).toBe(true);
    expect(store.messages()[0].role).toBe('user');
  });

  it('showConfirmation toggles showEndConfirmation', () => {
    expect(store.showEndConfirmation()).toBe(false);
    store.showConfirmation();
    expect(store.showEndConfirmation()).toBe(true);
    store.hideConfirmation();
    expect(store.showEndConfirmation()).toBe(false);
  });

  it('canSendMessage is false until wsReady when session exists', () => {
    store.setSession('p1', 'i1', { name: 'A', role: 'R', company: 'C' });
    expect(store.canSendMessage()).toBe(false);
    store.setWsReady(true);
    expect(store.canSendMessage()).toBe(true);
  });
});
