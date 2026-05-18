import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileFacade } from '@interv/state-profile';
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

    expect(navigate).toHaveBeenCalledWith(['/my-profile']);
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
