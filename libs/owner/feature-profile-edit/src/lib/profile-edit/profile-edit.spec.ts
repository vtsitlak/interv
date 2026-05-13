import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileFacade } from '@interv/state-profile';
import { ProfileEditComponent } from './profile-edit';

describe('ProfileEditComponent', () => {
  let fixture: ComponentFixture<ProfileEditComponent>;
  let component: ProfileEditComponent;
  const loadProfile = vi.fn().mockResolvedValue(undefined);
  const saveProfile = vi.fn().mockResolvedValue(undefined);
  const ingestToRAG = vi.fn().mockResolvedValue(undefined);
  const reportInvalidForm = vi.fn();

  beforeEach(async () => {
    loadProfile.mockClear();
    saveProfile.mockClear();
    ingestToRAG.mockClear();
    reportInvalidForm.mockClear();

    await TestBed.configureTestingModule({
      imports: [ProfileEditComponent],
      providers: [
        provideRouter([]),
        {
          provide: ProfileFacade,
          useValue: {
            error: () => null,
            successMessage: () => null,
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
              shareUrl: '/p/u1',
            }),
            loadProfile,
            saveProfile,
            ingestToRAG,
            reportInvalidForm,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEditComponent);
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

  it('onSave calls saveProfile and ingestToRAG when valid', async () => {
    component.profileModel.set({
      name: 'Name',
      title: 'Title',
      photo: '',
      summary: 'Summary',
      cvText: 'Long cv',
      links: [],
      personalQA: [{ question: 'Q', answer: 'A' }],
    });

    await component.onSave();

    expect(saveProfile).toHaveBeenCalled();
    expect(ingestToRAG).toHaveBeenCalledWith(
      'u1',
      'Long cv',
      expect.any(Array),
    );
  });

  it('onSave does nothing when form invalid', async () => {
    component.profileModel.set({
      name: '',
      title: '',
      photo: '',
      summary: '',
      cvText: '',
      links: [],
      personalQA: [],
    });

    await component.onSave();

    expect(saveProfile).not.toHaveBeenCalled();
    expect(reportInvalidForm).toHaveBeenCalled();
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
