import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { HomeComponent } from './home';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('links candidates to login and register', () => {
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('routerlink="/login"');
    expect(html).toContain('routerlink="/register"');
  });

  it('links recruiters to auth routes', () => {
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('routerlink="/recruiter/login"');
    expect(html).toContain('routerlink="/recruiter/register"');
  });

  it('shows beta notice in the footer', () => {
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('Beta');
    expect(html).toContain('early preview');
  });
});
