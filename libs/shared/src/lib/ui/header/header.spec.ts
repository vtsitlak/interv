import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderComponent } from './header';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits logoutRequested when Logout is clicked', () => {
    fixture.componentRef.setInput('isAuthenticated', true);
    fixture.detectChanges();

    const spy = vi.fn();
    component.logoutRequested.subscribe(spy);

    const btn: HTMLButtonElement | null = Array.from(
      fixture.nativeElement.querySelectorAll('button.btn-outline'),
    ).find((element: HTMLButtonElement) =>
      element.textContent?.trim().includes('Logout'),
    ) ?? null;
    expect(btn).toBeTruthy();
    btn.click();

    expect(spy).toHaveBeenCalled();
  });
});
