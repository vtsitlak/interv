import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileFacade, ProfileService } from '@interv/state-profile';
import { ProfileTrainComponent } from './profile-train';

describe('ProfileTrainComponent', () => {
  let fixture: ComponentFixture<ProfileTrainComponent>;
  let component: ProfileTrainComponent;
  const loadProfile = vi.fn().mockResolvedValue(undefined);
  const saveProfile = vi.fn().mockResolvedValue(undefined);
  const ingestToRAG = vi.fn().mockResolvedValue(undefined);
  const reportInvalidForm = vi.fn();
  const buildPersonalQA = vi.fn().mockResolvedValue([
    { question: 'As a T, what motivates you?', answer: '' },
  ]);
  let successMessage: string | null = null;

  beforeEach(async () => {
    successMessage = null;
    loadProfile.mockClear();
    saveProfile.mockClear();
    ingestToRAG.mockClear();
    reportInvalidForm.mockClear();
    buildPersonalQA.mockClear();

    await TestBed.configureTestingModule({
      imports: [ProfileTrainComponent],
      providers: [
        provideRouter([]),
        {
          provide: ProfileService,
          useValue: {
            currentUserOrNull: vi.fn().mockResolvedValue({ uid: 'u1' }),
            uploadProfilePhoto: vi.fn().mockResolvedValue('https://cdn.example/photo.jpg'),
          },
        },
        {
          provide: ProfileFacade,
          useValue: {
            error: () => null,
            successMessage: () => successMessage,
            isLoading: () => false,
            isSaving: () => false,
            isIngesting: () => false,
            profile: () => ({
              id: 'u1',
              userId: 'u1',
              name: 'N',
              title: 'T',
              photo: '',
              summary: 'S',
              cvText: 'CV text',
              links: [],
              personalQA: [{ question: 'Q', answer: 'A' }],
              isPublished: true,
              shareUrl: '/candidate/u1',
            }),
            loadProfile,
            saveProfile,
            ingestToRAG,
            reportInvalidForm,
            buildPersonalQA,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileTrainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isDirty is false until the form changes', async () => {
    await fixture.whenStable();
    expect(component.isDirty()).toBe(false);

    component.profileModel.update((model) => ({ ...model, name: 'Changed' }));
    expect(component.isDirty()).toBe(true);
  });

  it('onSave calls preventDefault when a submit event is passed', async () => {
    component.profileModel.set({
      name: 'Name',
      title: 'Title',
      photo: '',
      summary: 'Summary',
      cvText: 'Long cv',
      linkedIn: '',
      workPreferences: ['remote', 'full-time'],
      links: [],
      personalQA: [{ question: 'Q', answer: 'A' }],
    });
    const event = new SubmitEvent('submit', {
      bubbles: true,
      cancelable: true,
    });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    await component.onSave(event);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('onSave redirects to my-profile after successful ingest', async () => {
    ingestToRAG.mockImplementation(async () => {
      successMessage = 'Profile saved.';
    });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.profileModel.set({
      name: 'Name',
      title: 'Title',
      photo: '',
      summary: 'Summary',
      cvText: 'Long cv',
      linkedIn: '',
      workPreferences: [],
      links: [],
      personalQA: [{ question: 'Q', answer: 'A' }],
    });

    await component.onSave();

    expect(navigate).toHaveBeenCalledWith(['/candidate/my-profile']);
  });

  it('onSave calls saveProfile and ingestToRAG when valid', async () => {
    component.profileModel.set({
      name: 'Name',
      title: 'Title',
      photo: '',
      summary: 'Summary',
      cvText: 'Long cv',
      linkedIn: '',
      workPreferences: [],
      links: [],
      personalQA: [{ question: 'Q', answer: 'A' }],
    });

    await component.onSave();

    expect(saveProfile).toHaveBeenCalled();
    expect(ingestToRAG).toHaveBeenCalledWith(
      'u1',
      'Long cv',
      expect.any(Array),
      [],
    );
  });

  it('onSave does nothing when form invalid', async () => {
    component.profileModel.set({
      name: '',
      title: '',
      photo: '',
      summary: '',
      cvText: '',
      linkedIn: '',
      workPreferences: [],
      links: [],
      personalQA: [],
    });

    await component.onSave();

    expect(saveProfile).not.toHaveBeenCalled();
    expect(reportInvalidForm).toHaveBeenCalled();
  });

  it('toggleWorkPreference adds and removes preferences', () => {
    expect(component.isWorkPreferenceSelected('remote')).toBe(false);
    component.toggleWorkPreference('remote');
    expect(component.isWorkPreferenceSelected('remote')).toBe(true);
    component.toggleWorkPreference('remote');
    expect(component.isWorkPreferenceSelected('remote')).toBe(false);
  });

  it('addLink appends an empty link to the model', () => {
    const before = component.profileModel().links.length;
    component.addLink();
    expect(component.profileModel().links.length).toBe(before + 1);
  });

  it('onPhotoSelected uploads and sets photo URL on the model', async () => {
    const profileService = TestBed.inject(ProfileService);
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

    await component.onPhotoSelected({
      target: { files: [file], value: '' },
    } as unknown as Event);

    expect(profileService.uploadProfilePhoto).toHaveBeenCalledWith(
      'u1',
      file,
    );
    expect(component.profileModel().photo).toBe('https://cdn.example/photo.jpg');
  });

  it('shows placeholder initial when photo URL is empty', () => {
    component.profileModel.update((m) => ({ ...m, photo: '', name: 'Ada' }));
    fixture.detectChanges();

    expect(
      fixture.nativeElement
        .querySelector('interv-profile-photo [aria-hidden="true"]')
        ?.textContent?.trim(),
    ).toBe('A');
  });

  it('removePhoto clears stored photo URL', () => {
    component.profileModel.update((m) => ({
      ...m,
      photo: 'https://example.com/missing.jpg',
      name: 'Bob',
    }));
    expect(component.hasStoredPhoto()).toBe(true);

    component.removePhoto();

    expect(component.hasStoredPhoto()).toBe(false);
  });

  it('removeQA removes the QA at the given index', () => {
    component.profileModel.set({
      ...component.profileModel(),
      personalQA: [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
      ],
    });
    component.removeQA(0);
    const qa = component.profileModel().personalQA;
    expect(qa.length).toBe(1);
    expect(qa[0].question).toBe('Q2');
  });
});
