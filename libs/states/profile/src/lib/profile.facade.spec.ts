import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileFacade } from './profile.facade';
import { ProfileStore } from './profile.store';

describe('ProfileFacade', () => {
  let storeMock: {
    profile: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    isSaving: ReturnType<typeof vi.fn>;
    isIngesting: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    successMessage: ReturnType<typeof vi.fn>;
    isComplete: ReturnType<typeof vi.fn>;
    shareUrl: ReturnType<typeof vi.fn>;
    loadProfile: ReturnType<typeof vi.fn>;
    saveProfile: ReturnType<typeof vi.fn>;
    ingestToRAG: ReturnType<typeof vi.fn>;
    reportInvalidForm: ReturnType<typeof vi.fn>;
    clearMessages: ReturnType<typeof vi.fn>;
  };
  let facade: ProfileFacade;

  beforeEach(() => {
    storeMock = {
      profile: vi.fn().mockReturnValue(null),
      isLoading: vi.fn().mockReturnValue(false),
      isSaving: vi.fn().mockReturnValue(false),
      isIngesting: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
      successMessage: vi.fn().mockReturnValue(null),
      isComplete: vi.fn().mockReturnValue(false),
      shareUrl: vi.fn().mockReturnValue(null),
      loadProfile: vi.fn().mockResolvedValue(undefined),
      saveProfile: vi.fn().mockResolvedValue(undefined),
      ingestToRAG: vi.fn().mockResolvedValue(undefined),
      reportInvalidForm: vi.fn(),
      clearMessages: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ProfileFacade,
        { provide: ProfileStore, useValue: storeMock },
      ],
    });

    facade = TestBed.inject(ProfileFacade);
  });

  it('loadProfile() delegates to the store', async () => {
    await facade.loadProfile();

    expect(storeMock.loadProfile).toHaveBeenCalled();
  });

  it('saveProfile() forwards the partial profile to the store', async () => {
    const patch = { name: 'Ada' };

    await facade.saveProfile(patch);

    expect(storeMock.saveProfile).toHaveBeenCalledWith(patch);
  });

  it('ingestToRAG() forwards arguments to the store', async () => {
    await facade.ingestToRAG('p1', 'cv', []);

    expect(storeMock.ingestToRAG).toHaveBeenCalledWith('p1', 'cv', []);
  });

  it('reportInvalidForm() delegates to the store', () => {
    facade.reportInvalidForm();

    expect(storeMock.reportInvalidForm).toHaveBeenCalled();
  });
});
