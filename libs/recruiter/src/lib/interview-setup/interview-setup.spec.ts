import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewSetupComponent } from './interview-setup';

describe('InterviewSetupComponent', () => {
  let fixture: ComponentFixture<InterviewSetupComponent>;
  let component: InterviewSetupComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewSetupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InterviewSetupComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('profileId', 'p1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits startInterview with recruiter info when form is valid', () => {
    const spy = vi.fn();
    component.startInterview.subscribe(spy);

    component.recruiterModel.set({
      name: 'Jane',
      role: 'Recruiter',
      company: 'Acme',
    });
    fixture.detectChanges();

    component.onStartClick();

    expect(spy).toHaveBeenCalledWith({
      name: 'Jane',
      role: 'Recruiter',
      company: 'Acme',
    });
  });

  it('does not emit when profileId is blank', () => {
    const spy = vi.fn();
    component.startInterview.subscribe(spy);
    fixture.componentRef.setInput('profileId', '   ');
    fixture.detectChanges();

    component.recruiterModel.set({
      name: 'Jane',
      role: 'Recruiter',
      company: 'Acme',
    });
    fixture.detectChanges();

    component.onStartClick();

    expect(spy).not.toHaveBeenCalled();
  });
});
