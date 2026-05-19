import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';

export type ProfilePhotoSize = 'md' | 'lg';

const SIZE_STYLES: Record<
  ProfilePhotoSize,
  { box: string; text: string }
> = {
  md: {
    box: 'w-14 h-14 rounded-2xl',
    text: 'text-lg',
  },
  lg: {
    box: 'w-24 h-24 rounded-2xl',
    text: 'text-3xl',
  },
};

function profileInitialFromName(name: string): string {
  const initial = name.trim().charAt(0);
  return initial ? initial.toUpperCase() : '?';
}

@Component({
  selector: 'interv-profile-photo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'shrink-0' },
  templateUrl: './profile-photo.html',
})
export class ProfilePhotoComponent {
  readonly photo = input('');
  readonly name = input('');
  readonly size = input<ProfilePhotoSize>('lg');
  readonly alt = input<string | null>(null);

  private readonly loadFailed = signal(false);

  constructor() {
    effect(() => {
      this.photo();
      this.loadFailed.set(false);
    });
  }

  readonly photoSrc = computed(() => this.photo().trim());
  readonly altText = computed(
    () => this.alt() ?? (this.name().trim() || 'Profile photo'),
  );
  readonly initial = computed(() => profileInitialFromName(this.name()));
  readonly showPhoto = computed(
    () => !!this.photoSrc() && !this.loadFailed(),
  );
  readonly imageClass = computed(
    () => `${SIZE_STYLES[this.size()].box} object-cover`,
  );
  readonly placeholderClass = computed(
    () =>
      `${SIZE_STYLES[this.size()].box} bg-primary/10 flex items-center justify-center ${SIZE_STYLES[this.size()].text} font-bold text-primary`,
  );

  onPhotoError(): void {
    this.loadFailed.set(true);
  }
}
