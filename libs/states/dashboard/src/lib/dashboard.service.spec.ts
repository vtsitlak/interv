import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { beforeEach, describe, expect, it } from 'vitest';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        { provide: Auth, useValue: { currentUser: null } },
        { provide: Firestore, useValue: {} },
      ],
    });
    service = TestBed.inject(DashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getInterviewsPage() returns empty page when not signed in', async () => {
    await expect(service.getInterviewsPage()).resolves.toEqual({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
  });
});
