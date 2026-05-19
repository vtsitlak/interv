import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { WS_URL } from '@interv/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { InterviewService } from './interview.service';

describe('InterviewService', () => {
  let service: InterviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: WS_URL, useValue: 'ws://127.0.0.1:8000' },
      ],
    });
    service = TestBed.inject(InterviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
