import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InfiniteScrollDirective } from './infinite-scroll.directive';

@Component({
  standalone: true,
  imports: [InfiniteScrollDirective],
  template: `
    <div
      intervInfiniteScroll
      style="height: 100px; overflow-y: auto;"
      (scrolled)="onScrolled()"
    >
      @for (item of items; track item) {
        <p>{{ item }}</p>
      }
    </div>
  `,
})
class HostComponent {
  items = Array.from({ length: 20 }, (_, index) => `Item ${index + 1}`);
  onScrolled = vi.fn();
}

type IntersectionObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver,
) => void;

class MockIntersectionObserver {
  static latestCallback: IntersectionObserverCallback | null = null;

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    MockIntersectionObserver.latestCallback = callback;
  }
}

describe('InfiniteScrollDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let component: HostComponent;

  beforeEach(async () => {
    MockIntersectionObserver.latestCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and attach a sentinel', () => {
    const host: HTMLElement = fixture.nativeElement.querySelector('div');
    expect(host.querySelector('[data-infinite-scroll-sentinel]')).toBeTruthy();
  });

  it('emits scrolled when the sentinel intersects', () => {
    const callback = MockIntersectionObserver.latestCallback;
    expect(callback).toBeTruthy();

    callback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(component.onScrolled).toHaveBeenCalledTimes(1);
  });

  it('does not emit scrolled when the sentinel is not intersecting', () => {
    const callback = MockIntersectionObserver.latestCallback;

    callback?.(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(component.onScrolled).not.toHaveBeenCalled();
  });
});
