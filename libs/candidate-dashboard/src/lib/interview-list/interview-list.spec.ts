import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InterviewSummary } from '@interv/state-dashboard';
import { InterviewListComponent } from './interview-list';

const sampleInterview: InterviewSummary = {
  id: 'int1',
  recruiterName: 'Alex',
  recruiterRole: 'HR',
  recruiterCompany: 'Acme',
  isPracticeSession: false,
  status: 'complete',
  feedbackScore: 8,
  feedbackText: 'Great',
  requestContact: true,
  recruiterContactEmail: 'alex@acme.com',
  aiSummary: null,
  messageCount: 4,
  createdAt: new Date('2025-01-15'),
  completedAt: new Date('2025-01-16'),
};

describe('InterviewListComponent', () => {
  let fixture: ComponentFixture<InterviewListComponent>;
  let component: InterviewListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InterviewListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('interviews', [sampleInterview]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('scoreColor() maps scores to badge classes', () => {
    expect(component.scoreColor(null)).toBe('badge-ghost');
    expect(component.scoreColor(9)).toBe('badge-success');
    expect(component.scoreColor(6)).toBe('badge-warning');
    expect(component.scoreColor(3)).toBe('badge-error');
  });

  it('emits interviewSelect when an interview is chosen', () => {
    const emit = vi.spyOn(component.interviewSelect, 'emit');

    component.onSelect(sampleInterview);

    expect(emit).toHaveBeenCalledWith(sampleInterview);
  });
});
