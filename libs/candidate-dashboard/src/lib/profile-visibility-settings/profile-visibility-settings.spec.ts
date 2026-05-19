import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileVisibilitySettingsComponent } from './profile-visibility-settings';

describe('ProfileVisibilitySettingsComponent', () => {
  let fixture: ComponentFixture<ProfileVisibilitySettingsComponent>;
  let component: ProfileVisibilitySettingsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileVisibilitySettingsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileVisibilitySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits publicProfileEnabledChange when disable checkbox toggles', () => {
    const emit = vi.spyOn(component.publicProfileEnabledChange, 'emit');

    component.onDisablePublicProfileChange({
      target: { checked: true },
    } as unknown as Event);

    expect(emit).toHaveBeenCalledWith(false);
  });

  it('emits discoverableByRecruitersChange when hide checkbox toggles', () => {
    const emit = vi.spyOn(component.discoverableByRecruitersChange, 'emit');

    component.onHideFromRecruitersChange({
      target: { checked: false },
    } as unknown as Event);

    expect(emit).toHaveBeenCalledWith(true);
  });
});
