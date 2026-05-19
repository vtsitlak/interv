import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

@Directive({
  selector: '[intervInfiniteScroll]',
  standalone: true,
})
export class InfiniteScrollDirective {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly disabled = input(false);
  readonly rootMargin = input('0px 0px 100px 0px');
  readonly threshold = input(0);

  readonly scrolled = output<void>();

  private observer: IntersectionObserver | null = null;
  private sentinel: HTMLDivElement | null = null;

  constructor() {
    afterNextRender(() => {
      this.setupObserver();
    });

    this.destroyRef.onDestroy(() => {
      this.teardownObserver();
    });
  }

  private setupObserver(): void {
    if (this.disabled()) {
      return;
    }

    const root = this.host.nativeElement;
    const isScrollable = root.scrollHeight > root.clientHeight;

    this.sentinel = document.createElement('div');
    this.sentinel.setAttribute('data-infinite-scroll-sentinel', '');
    this.sentinel.style.height = '1px';
    this.sentinel.style.width = '100%';
    this.sentinel.style.pointerEvents = 'none';
    root.appendChild(this.sentinel);

    this.observer = new IntersectionObserver(
      (entries) => {
        if (this.disabled()) {
          return;
        }

        const entry = entries[0];
        if (entry?.isIntersecting) {
          this.scrolled.emit();
        }
      },
      {
        root: isScrollable ? root : null,
        rootMargin: this.rootMargin(),
        threshold: this.threshold(),
      },
    );

    this.observer.observe(this.sentinel);
  }

  private teardownObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.sentinel?.remove();
    this.sentinel = null;
  }
}
