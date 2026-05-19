import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

const ICON_SIZES: Record<LogoSize, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const WORDMARK_SIZES: Record<LogoSize, string> = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

@Component({
  selector: 'interv-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  templateUrl: './logo.html',
})
export class LogoComponent {
  readonly size = input<LogoSize>('md');
  readonly showWordmark = input(true);
  readonly wordmark = input('Interv');

  readonly iconClass = computed(
    () => `${ICON_SIZES[this.size()]} shrink-0`,
  );
  readonly wordmarkClass = computed(
    () =>
      `${WORDMARK_SIZES[this.size()]} font-semibold tracking-tight text-base-content`,
  );
  readonly hostClass = computed(() =>
    this.showWordmark() ? '' : 'justify-center',
  );
}
