import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  applyEach,
  form,
  FormField,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import type { ProfileLink, QAPair, WorkPreference } from '@interv/models';
import { normalizeWorkPreferences, WORK_PREFERENCE_GROUPS } from '@interv/models';
import {
  canGenerateRoleSpecificPersonalQA,
  hasPersonalQAAnswers,
  ProfileFacade,
} from '@interv/state-profile';

interface ProfileFormModel {
  name: string;
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
  selector: 'lib-profile-train',
  standalone: true,
  imports: [FormField, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-train.html',
  styleUrl: './profile-train.scss',
})
export class ProfileTrainComponent implements OnInit {
  private readonly doc = inject(DOCUMENT);

  readonly facade = inject(ProfileFacade);

  readonly workPreferenceGroups = WORK_PREFERENCE_GROUPS;

  readonly profileModel = signal<ProfileFormModel>({ ...EMPTY_MODEL });
  readonly isLoadingPersonalQA = signal(false);
  readonly profileId = signal<string | null>(null);

  readonly profileForm = form(this.profileModel, (path) => {
    required(path.name, { message: 'Full name is required' });
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

  async onSave(event?: Event): Promise<void> {
    event?.preventDefault();
    if (this.profileForm().invalid()) {
      this.facade.reportInvalidForm();
      return;
    }
    const {
      name,
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
    }
  }
}
