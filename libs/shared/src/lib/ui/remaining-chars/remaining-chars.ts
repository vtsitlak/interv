import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { remainingChars } from '../../util/remaining-chars';

@Component({
  selector: 'interv-remaining-chars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="text-xs text-base-content/50 mt-1">{{ label() }}</p>`,
})
export class RemainingCharsComponent {
  readonly value = input('');
  readonly maxLength = input.required<number>();

  readonly label = computed(() => {
    const left = remainingChars(this.value(), this.maxLength());
    return `${left} character${left === 1 ? '' : 's'} remaining`;
  });
}
