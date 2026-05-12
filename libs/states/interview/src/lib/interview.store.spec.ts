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
    store.setComplete();
    expect(store.canSendMessage()).toBe(false);
  });

  it('addUserMessage increments messageCount and sets streaming', () => {
    store.addUserMessage('hello');
    expect(store.messageCount()).toBe(1);
    expect(store.isStreaming()).toBe(true);
    expect(store.messages()[0].role).toBe('user');
  });
});
