import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  applyEach,
  form,
  FormField,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import type { ProfileLink, QAPair } from '@interv/models';
import { ProfileFacade } from '@interv/state-profile';

const DEFAULT_QUESTIONS = [
  "What's your ideal working environment?",
  'How do you handle conflict in a team?',
  'What are you looking for in your next role?',
  'What are your salary expectations?',
  'Are you open to relocation or remote work?',
  "What's a project you're most proud of?",
  'How do you approach learning new technologies?',
  'What kind of team culture do you thrive in?',
];

interface ProfileFormModel {
  name: string;
  title: string;
  photo: string;
  summary: string;
  cvText: string;
  links: ProfileLink[];
  personalQA: QAPair[];
}

const EMPTY_MODEL: ProfileFormModel = {
  name: '',
  title: '',
  photo: '',
  summary: '',
  cvText: '',
  links: [],
  personalQA: [],
};

@Component({
  selector: 'lib-profile-edit',
  standalone: true,
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.scss',
})
export class ProfileEditComponent implements OnInit {
  readonly facade = inject(ProfileFacade);

  readonly profileModel = signal<ProfileFormModel>({ ...EMPTY_MODEL });

  readonly profileForm = form(this.profileModel, (path) => {
    required(path.name, { message: 'Full name is required' });
    required(path.title, { message: 'Job title is required' });
    required(path.summary, { message: 'Summary is required' });
    required(path.cvText, { message: 'CV text is required' });
    applyEach(path.links, (linkPath) => {
      required(linkPath.url, { message: 'URL is required' });
    });
    applyEach(path.personalQA, (qaPath) => {
      required(qaPath.question, { message: 'Question is required' });
    });
  });

  ngOnInit(): void {
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    await this.facade.loadProfile();
    const p = this.facade.profile();
    if (p) {
      this.profileModel.set({
        name: p.name,
        title: p.title,
        photo: p.photo ?? '',
        summary: p.summary,
        cvText: p.cvText,
        links: [...(p.links ?? [])],
        personalQA: p.personalQA?.length
          ? [...p.personalQA]
          : this.defaultQuestions(),
      });
    } else {
      this.profileModel.update((m) => ({
        ...m,
        personalQA: this.defaultQuestions(),
      }));
    }
  }

  private defaultQuestions(): QAPair[] {
    return DEFAULT_QUESTIONS.map((question) => ({ question, answer: '' }));
  }

  addLink(): void {
    this.profileModel.update((m) => ({
      ...m,
      links: [...m.links, { label: '', url: '' }],
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

  async onSave(): Promise<void> {
    if (this.profileForm().invalid()) {
      this.facade.reportInvalidForm();
      return;
    }
    const { name, title, photo, summary, cvText, links, personalQA } =
      this.profileModel();

    await this.facade.saveProfile({
      name,
      title,
      photo,
      summary,
      cvText,
      links,
      personalQA,
    });

    const profile = this.facade.profile();
    if (profile) {
      await this.facade.ingestToRAG(profile.id, cvText, personalQA);
    }
  }
}
