import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProfilePhotoComponent } from './profile-photo';

describe('ProfilePhotoComponent', () => {
  let fixture: ComponentFixture<ProfilePhotoComponent>;
  let component: ProfilePhotoComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePhotoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePhotoComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'Ada Lovelace');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders placeholder initial when photo is empty', () => {
    fixture.componentRef.setInput('photo', '');
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('[aria-hidden="true"]');
    expect(placeholder?.textContent?.trim()).toBe('A');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('renders image when photo URL is set', () => {
    fixture.componentRef.setInput('photo', 'https://example.com/p.jpg');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/p.jpg');
    expect(img?.getAttribute('alt')).toBe('Ada Lovelace');
  });

  it('uses custom alt text when provided', () => {
    fixture.componentRef.setInput('photo', 'https://example.com/p.jpg');
    fixture.componentRef.setInput('alt', 'Profile photo preview');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')?.getAttribute('alt')).toBe(
      'Profile photo preview',
    );
  });

  it('falls back to placeholder when image fails to load', () => {
    fixture.componentRef.setInput('photo', 'https://example.com/missing.jpg');
    fixture.detectChanges();

    component.onPhotoError();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[aria-hidden="true"]')?.textContent?.trim(),
    ).toBe('A');
  });

  it('resets load failure when photo URL changes', () => {
    fixture.componentRef.setInput('photo', 'https://example.com/missing.jpg');
    fixture.detectChanges();
    component.onPhotoError();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();

    fixture.componentRef.setInput('photo', 'https://example.com/new.jpg');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/new.jpg',
    );
  });
});
