import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'interv-confirm-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-modal.html',
})
export class ConfirmModalComponent {
  readonly open = input(false);
  readonly title = input('Confirm');
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly isConfirming = input(false);
  readonly confirmButtonClass = input('btn-error');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  onConfirm(): void {
    if (this.isConfirming()) {
      return;
    }
    this.confirmed.emit();
  }

  onCancel(): void {
    if (this.isConfirming()) {
      return;
    }
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }
    this.onCancel();
  }
}
