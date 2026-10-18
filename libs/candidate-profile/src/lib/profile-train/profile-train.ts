import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  applyEach,
  form,
  FormField,
  maxLength,
  minLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { Router } from '@angular/router';
import type { ProfileLink, QAPair, WorkPreference } from '@interv/shared';
import {
  isReservedUsername,
  normalizeUsername,
  normalizeWorkPreferences,
  PROFILE_FIELD_LIMITS,
  ProfilePhotoComponent,
  RemainingCharsComponent,
  serializeProfileTrainForm,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  WORK_PREFERENCE_GROUPS,
} from '@interv/shared';
import {
  canGenerateRoleSpecificPersonalQA,
  hasPersonalQAAnswers,
  ProfileFacade,
  ProfileService,
} from '@interv/state-profile';

interface ProfileFormModel {
  name: string;
  username: string;
  showFullNameOnPublicProfile: boolean;
  title: string;
  photo: string;
  summary: string;
  cvText: string;
  linkedIn: string;
  workPreferences: WorkPreference[];
  links: ProfileLink[];
  personalQA: QAPair[];
}

const EMPTY_MODEL: ProfileFormModel = {
  name: '',
  username: '',
  showFullNameOnPublicProfile: true,
  title: '',
  photo: '',
  summary: '',
  cvText: '',
  linkedIn: '',
  workPreferences: [],
  links: [],
  personalQA: [],
};

/** Normalize legacy Firestore links (`label` / `url`) into `description` / `link`. */
function normalizeLinks(
  links: Array<Partial<ProfileLink> & { label?: string; url?: string }>,
): ProfileLink[] {
  return links.map((item) => ({
    link: (item.link ?? item.url ?? '').trim(),
    description: (item.description ?? item.label ?? '').trim(),
  }));
}

@Component({
  selector: 'interv-profile-train',
  standalone: true,
  imports: [FormField, ProfilePhotoComponent, RemainingCharsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-train.html',
  styleUrl: './profile-train.scss',
})
export class ProfileTrainComponent implements OnInit {
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);

  readonly facade = inject(ProfileFacade);
  private readonly profileService = inject(ProfileService);

  readonly workPreferenceGroups = WORK_PREFERENCE_GROUPS;
  readonly fieldLimits = PROFILE_FIELD_LIMITS;

  readonly profileModel = signal<ProfileFormModel>({ ...EMPTY_MODEL });
  private readonly savedSnapshot = signal<string | null>(null);
  readonly isDirty = computed(() => {
    const saved = this.savedSnapshot();
    if (saved === null) {
      return false;
    }
    return serializeProfileTrainForm(this.profileModel()) !== saved;
  });
  readonly isLoadingPersonalQA = signal(false);
  readonly isUploadingPhoto = signal(false);
  readonly photoUploadError = signal<string | null>(null);
  readonly profileId = signal<string | null>(null);
  readonly usernameCheckMessage = signal<string | null>(null);
  readonly usernameAvailable = signal<boolean | null>(null);
  readonly isCheckingUsername = signal(false);
  readonly sharePathPreview = computed(() => {
    const username = normalizeUsername(this.profileModel().username);
    return username ? `/candidate/${username}` : '/candidate/your-username';
  });

  readonly profileForm = form(this.profileModel, (path) => {
    required(path.name, { message: 'Full name is required' });
    required(path.username, { message: 'Username is required' });
    minLength(path.username, USERNAME_MIN_LENGTH, {
      message: `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
    });
    maxLength(path.username, USERNAME_MAX_LENGTH, {
      message: `Username must be at most ${USERNAME_MAX_LENGTH} characters`,
    });
    pattern(path.username, USERNAME_PATTERN, {
      message:
        'Use only lowercase letters, numbers, and hyphens (no spaces or symbols)',
    });
    validate(path.username, ({ value }) => {
      const normalized = normalizeUsername(value());
      if (normalized && isReservedUsername(normalized)) {
        return {
          kind: 'usernameReserved',
          message: 'That username is reserved. Choose another.',
        };
      }
      return undefined;
    });
    required(path.title, { message: 'Job title is required' });
    required(path.summary, { message: 'Summary is required' });
    required(path.cvText, { message: 'CV text is required' });
    applyEach(path.links, (linkPath) => {
      required(linkPath.link, { message: 'URL is required' });
    });
    applyEach(path.personalQA, (qaPath) => {
      required(qaPath.question, { message: 'Question is required' });
    });
  });

  ngOnInit(): void {
    this.stripAccidentalQueryString();
    void this.bootstrap();
  }

  /**
   * If the browser navigated with a native GET form submit, secrets can land in the URL.
   * Strip the query string once so reloads and history stay clean.
   */
  private stripAccidentalQueryString(): void {
    const win = this.doc.defaultView;
    if (!win?.location.search) {
      return;
    }
    const clean = `${win.location.pathname}${win.location.hash}`;
    win.history.replaceState(win.history.state, '', clean);
  }

  private async bootstrap(): Promise<void> {
    await this.facade.loadProfile();
    const p = this.facade.profile();
    if (p) {
      this.profileId.set(p.id);
      const personalQA = hasPersonalQAAnswers(p.personalQA)
        ? [...(p.personalQA ?? [])]
        : [];

      this.profileModel.set({
        name: p.name,
        username: p.username ?? '',
        showFullNameOnPublicProfile: p.showFullNameOnPublicProfile !== false,
        title: p.title,
        photo: p.photo ?? '',
        summary: p.summary,
        cvText: p.cvText,
        linkedIn: p.linkedIn ?? '',
        workPreferences: normalizeWorkPreferences(p.workPreferences),
        links: normalizeLinks(p.links ?? []),
        personalQA,
      });

      if (
        !hasPersonalQAAnswers(p.personalQA) &&
        canGenerateRoleSpecificPersonalQA(p.title, p.summary)
      ) {
        await this.refreshPersonalQA();
      }
    }
    this.markSavedSnapshot();
  }

  private markSavedSnapshot(): void {
    this.savedSnapshot.set(serializeProfileTrainForm(this.profileModel()));
  }

  onUsernameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const normalized = normalizeUsername(input.value).slice(0, USERNAME_MAX_LENGTH);
    if (input.value !== normalized) {
      input.value = normalized;
    }
    this.profileModel.update((m) => ({ ...m, username: normalized }));
    this.usernameAvailable.set(null);
    this.usernameCheckMessage.set(null);
  }

  async onUsernameBlur(): Promise<void> {
    const username = normalizeUsername(this.profileModel().username);
    this.profileModel.update((m) => ({ ...m, username }));
    if (!username || this.profileForm.username().invalid()) {
      this.usernameAvailable.set(null);
      this.usernameCheckMessage.set(null);
      return;
    }

    const user = await this.profileService.currentUserOrNull();
    if (!user) {
      this.usernameAvailable.set(false);
      this.usernameCheckMessage.set('You must be signed in to check username.');
      return;
    }

    this.isCheckingUsername.set(true);
    try {
      const result = await this.profileService.checkUsernameAvailability(
        username,
        user.uid,
      );
      if (!result.available) {
        this.usernameAvailable.set(false);
        this.usernameCheckMessage.set(
          result.message ?? 'That username is not available',
        );
        return;
      }

      const alreadySaved =
        normalizeUsername(this.facade.profile()?.username ?? '') === username;
      if (alreadySaved) {
        this.usernameAvailable.set(true);
        this.usernameCheckMessage.set('Username saved');
        return;
      }

      await this.facade.claimUsername(
        username,
        this.profileModel().showFullNameOnPublicProfile,
      );
      this.profileId.set(this.facade.profile()?.id ?? user.uid);
      this.patchSavedSnapshotUsername(username);
      this.usernameAvailable.set(true);
      this.usernameCheckMessage.set('Username saved');
    } catch (e: unknown) {
      this.usernameAvailable.set(false);
      this.usernameCheckMessage.set(
        e instanceof Error ? e.message : 'Could not save username.',
      );
    } finally {
      this.isCheckingUsername.set(false);
    }
  }

  /** Keep other form dirty state; only mark username as matching the last save. */
  private patchSavedSnapshotUsername(username: string): void {
    const previous = this.savedSnapshot();
    if (!previous) {
      return;
    }
    try {
      const parsed = JSON.parse(previous) as {
        username?: string;
        showFullNameOnPublicProfile?: boolean;
      };
      parsed.username = username;
      parsed.showFullNameOnPublicProfile =
        this.profileModel().showFullNameOnPublicProfile;
      this.savedSnapshot.set(JSON.stringify(parsed));
    } catch {
      /* ignore malformed snapshot */
    }
  }

  /** Regenerate tailored questions from the current job title and summary. */
  async refreshPersonalQA(): Promise<void> {
    const { title, summary, personalQA } = this.profileModel();

    this.isLoadingPersonalQA.set(true);
    try {
      const generated = await this.facade.buildPersonalQA(
        this.profileId(),
        title,
        summary,
      );
      const answersByQuestion = new Map(
        personalQA
          .filter((qa) => qa.question.trim() && qa.answer.trim())
          .map((qa) => [qa.question.trim().toLowerCase(), qa.answer]),
      );

      this.profileModel.update((m) => ({
        ...m,
        personalQA: generated.map((qa) => ({
          question: qa.question,
          answer: answersByQuestion.get(qa.question.trim().toLowerCase()) ?? '',
        })),
      }));
    } finally {
      this.isLoadingPersonalQA.set(false);
    }
  }

  isWorkPreferenceSelected(id: WorkPreference): boolean {
    return this.profileModel().workPreferences.includes(id);
  }

  hasStoredPhoto(): boolean {
    return !!this.profileModel().photo.trim();
  }

  removePhoto(): void {
    this.photoUploadError.set(null);
    this.profileModel.update((m) => ({ ...m, photo: '' }));
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    const user = await this.profileService.currentUserOrNull();
    if (!user) {
      this.photoUploadError.set('You must be signed in to upload a photo.');
      return;
    }

    this.photoUploadError.set(null);
    this.isUploadingPhoto.set(true);
    try {
      const url = await this.profileService.uploadProfilePhoto(user.uid, file);
      this.profileModel.update((m) => ({ ...m, photo: url }));
    } catch (e: unknown) {
      this.photoUploadError.set(
        e instanceof Error ? e.message : 'Could not upload photo.',
      );
    } finally {
      this.isUploadingPhoto.set(false);
    }
  }

  toggleWorkPreference(id: WorkPreference): void {
    this.profileModel.update((m) => {
      const next = new Set(m.workPreferences);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return {
        ...m,
        workPreferences: normalizeWorkPreferences([...next]),
      };
    });
  }

  onShowFullNameChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.profileModel.update((m) => ({
      ...m,
      showFullNameOnPublicProfile: checked,
    }));
  }

  addLink(): void {
    this.profileModel.update((m) => ({
      ...m,
      links: [...m.links, { link: '', description: '' }],
    }));
  }

  removeLink(i: number): void {
    this.profileModel.update((m) => ({
      ...m,
      links: m.links.filter((_, idx) => idx !== i),
    }));
  }

  addQA(): void {
    this.profileModel.update((m) => ({
      ...m,
      personalQA: [...m.personalQA, { question: '', answer: '' }],
    }));
  }

  removeQA(i: number): void {
    this.profileModel.update((m) => ({
      ...m,
      personalQA: m.personalQA.filter((_, idx) => idx !== i),
    }));
  }

  async onSave(event: Event): Promise<void> {
    event.preventDefault();
    const username = normalizeUsername(this.profileModel().username);
    this.profileModel.update((m) => ({ ...m, username }));

    if (this.profileForm().invalid()) {
      this.facade.reportInvalidForm();
      return;
    }

    const user = await this.profileService.currentUserOrNull();
    if (!user) {
      this.facade.reportInvalidForm();
      return;
    }

    const availability = await this.profileService.checkUsernameAvailability(
      username,
      user.uid,
    );
    if (!availability.available) {
      this.usernameAvailable.set(false);
      this.usernameCheckMessage.set(
        availability.message ?? 'That username is not available',
      );
      this.facade.reportInvalidForm();
      return;
    }

    const {
      name,
      showFullNameOnPublicProfile,
      title,
      photo,
      summary,
      cvText,
      linkedIn,
      workPreferences,
      links,
      personalQA,
    } = this.profileModel();

    await this.facade.saveProfile({
      name,
      username,
      showFullNameOnPublicProfile,
      title,
      photo,
      summary,
      cvText,
      linkedIn: linkedIn.trim() || undefined,
      workPreferences:
        workPreferences.length > 0 ? workPreferences : undefined,
      links,
      personalQA,
    });

    const profile = this.facade.profile();
    if (profile) {
      this.profileId.set(profile.id);
      await this.facade.ingestToRAG(profile.id, cvText, personalQA, links);
      this.markSavedSnapshot();
      if (this.facade.successMessage()) {
        await this.router.navigate(['/candidate/my-profile']);
      }
    }
  }
}
