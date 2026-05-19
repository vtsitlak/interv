import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { API_URL } from '@interv/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProfileService, validateProfilePhotoFile } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: { currentUser: null } },
        { provide: Firestore, useValue: {} },
        { provide: API_URL, useValue: 'http://localhost:8000' },
      ],
    });
    service = TestBed.inject(ProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('returns the existing currentUser without subscribing to authState', async () => {
    const fakeUser = { uid: 'u1' } as unknown;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: { currentUser: fakeUser } },
        { provide: Firestore, useValue: {} },
        { provide: API_URL, useValue: 'http://localhost:8000' },
      ],
    });

    const localService = TestBed.inject(ProfileService);

    await expect(localService.currentUserOrNull()).resolves.toBe(fakeUser);
  });

  it('validateProfilePhotoFile rejects unsupported types', () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    expect(validateProfilePhotoFile(file)).toContain('JPEG');
  });
});
