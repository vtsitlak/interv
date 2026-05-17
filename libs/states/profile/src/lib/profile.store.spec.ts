import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@interv/models';
import {
  INVALID_FORM_MESSAGE,
  NOT_SIGNED_IN_LOAD_MESSAGE,
  NOT_SIGNED_IN_SAVE_MESSAGE,
  PROFILE_SAVED_MESSAGE,
} from './profile.models';
import { ProfileService } from './profile.service';
import { ProfileStore } from './profile.store';

const sampleProfile = {
  id: 'u1',
  userId: 'u1',
  name: 'Ada',
  title: 'Eng',
  photo: '',
  summary: 'Hello',
  cvText: 'CV',
  links: [],
  personalQA: [],
  isPublished: true,
  shareUrl: '/candidate/u1',
} as unknown as Profile;

describe('ProfileStore', () => {
  let profileService: Pick<
    ProfileService,
    'currentUserOrNull' | 'getProfile' | 'saveProfile' | 'ingest'
  >;
  let store: InstanceType<typeof ProfileStore>;

  beforeEach(() => {
    profileService = {
      currentUserOrNull: vi.fn().mockResolvedValue({ uid: 'u1' }),
      getProfile: vi.fn().mockResolvedValue(sampleProfile),
      saveProfile: vi.fn().mockResolvedValue(sampleProfile),
      ingest: vi.fn().mockResolvedValue({}),
    };

    TestBed.configureTestingModule({
      providers: [
        ProfileStore,
        { provide: ProfileService, useValue: profileService },
      ],
    });

    store = TestBed.inject(ProfileStore);
  });

  it('loadProfile() fills the store and updates isComplete', async () => {
    await store.loadProfile();

    expect(profileService.getProfile).toHaveBeenCalledWith('u1');
    expect(store.profile()).toBe(sampleProfile);
    expect(store.isLoading()).toBe(false);
    expect(store.isComplete()).toBe(true);
    expect(store.shareUrl()).toBe('/candidate/u1');
  });

  it('loadProfile() reports an error when no user is signed in', async () => {
    vi.mocked(profileService.currentUserOrNull).mockResolvedValueOnce(null);

    await store.loadProfile();

    expect(store.error()).toBe(NOT_SIGNED_IN_LOAD_MESSAGE);
    expect(store.profile()).toBeNull();
  });

  it('saveProfile() delegates to the service and stores the refreshed profile', async () => {
    const patch = { name: 'Ada' };

    await store.saveProfile(patch);

    expect(profileService.saveProfile).toHaveBeenCalledWith('u1', patch, null);
    expect(store.profile()).toBe(sampleProfile);
    expect(store.isSaving()).toBe(false);
  });

  it('saveProfile() reports an error when no user is signed in', async () => {
    vi.mocked(profileService.currentUserOrNull).mockResolvedValueOnce(null);

    await store.saveProfile({ name: 'Ada' });

    expect(store.error()).toBe(NOT_SIGNED_IN_SAVE_MESSAGE);
  });

  it('ingestToRAG() sets the success message on success', async () => {
    await store.ingestToRAG('p1', 'cv', []);

    expect(profileService.ingest).toHaveBeenCalledWith('p1', 'cv', [], []);
    expect(store.successMessage()).toBe(PROFILE_SAVED_MESSAGE);
    expect(store.isIngesting()).toBe(false);
  });

  it('ingestToRAG() appends link scrape info to the success message', async () => {
    vi.mocked(profileService.ingest).mockResolvedValueOnce({
      linksScraped: 2,
      skippedReason:
        'LinkedIn links cannot be scraped automatically — add your LinkedIn summary to your CV or Q&A instead',
    });

    await store.ingestToRAG('p1', 'cv', [], [
      {
        description: 'My GitHub profile',
        link: 'https://github.com/user',
      },
    ]);

    expect(store.successMessage()).toContain('Ingested content from 2 link(s)');
    expect(store.successMessage()).toContain('LinkedIn');
  });

  it('ingestToRAG() clears the success message and sets error on failure', async () => {
    vi.mocked(profileService.ingest).mockRejectedValueOnce(
      new Error('boom'),
    );

    await store.ingestToRAG('p1', 'cv', []);

    expect(store.error()).toBe('boom');
    expect(store.successMessage()).toBeNull();
  });

  it('reportInvalidForm() sets a static error message', () => {
    store.reportInvalidForm();

    expect(store.error()).toBe(INVALID_FORM_MESSAGE);
    expect(store.successMessage()).toBeNull();
  });
});
