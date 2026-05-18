import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecruiterComingSoonComponent } from './recruiter-coming-soon';

describe('RecruiterComingSoonComponent', () => {
  let fixture: ComponentFixture<RecruiterComingSoonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecruiterComingSoonComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { heading: 'Recruiter sign in' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecruiterComingSoonComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows heading and home link', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Recruiter sign in');
    expect(el.querySelector('a[routerLink="/"]')).toBeTruthy();
  });
});
