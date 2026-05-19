import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InterviewSummary } from '@interv/state-dashboard';
import { InterviewDetailModalComponent } from './interview-detail-modal';

const sampleInterview: InterviewSummary = {
  id: 'int1',
  recruiterName: 'Alex',
  recruiterRole: 'HR',
  recruiterCompany: 'Acme',
  isPracticeSession: false,
  status: 'complete',
  feedbackScore: 8,
  feedbackText: 'Great fit',
  requestContact: true,
  recruiterContactEmail: 'alex@acme.com',
  aiSummary: 'Strong technical answers.',
  messageCount: 4,
  createdAt: new Date('2025-01-15'),
  completedAt: new Date('2025-01-16'),
};

describe('InterviewDetailModalComponent', () => {
  let fixture: ComponentFixture<InterviewDetailModalComponent>;
  let component: InterviewDetailModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewDetailModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InterviewDetailModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('interview', sampleInterview);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('roleLabel() uses You for practice session user messages', () => {
    expect(component.roleLabel('user', true)).toBe('You');
    expect(component.roleLabel('assistant', true)).toBe('AI twin');
    expect(component.roleLabel('user', false)).toBe('Recruiter');
  });

  it('scoreColor() maps scores to badge classes', () => {
    expect(component.scoreColor(null)).toBe('badge-ghost');
    expect(component.scoreColor(9)).toBe('badge-success');
    expect(component.scoreColor(6)).toBe('badge-warning');
    expect(component.scoreColor(3)).toBe('badge-error');
  });

  it('close() emits closed', () => {
    const emit = vi.spyOn(component.closed, 'emit');

    component.close();

    expect(emit).toHaveBeenCalled();
  });

  it('closeOnBackdrop() closes only when clicking the backdrop', () => {
    const emit = vi.spyOn(component.closed, 'emit');
    const backdrop = document.createElement('div');
    const inner = document.createElement('div');
    backdrop.appendChild(inner);

    component.closeOnBackdrop({
      target: inner,
      currentTarget: backdrop,
    } as unknown as MouseEvent);
    expect(emit).not.toHaveBeenCalled();

    component.closeOnBackdrop({
      target: backdrop,
      currentTarget: backdrop,
    } as unknown as MouseEvent);
    expect(emit).toHaveBeenCalled();
  });
});
