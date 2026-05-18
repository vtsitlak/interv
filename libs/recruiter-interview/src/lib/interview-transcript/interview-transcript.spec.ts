import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { InterviewTranscriptComponent } from './interview-transcript';

describe('InterviewTranscriptComponent', () => {
  let fixture: ComponentFixture<InterviewTranscriptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewTranscriptComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InterviewTranscriptComponent);
    fixture.componentRef.setInput('messages', [
      {
        role: 'user',
        content: 'Tell me about your experience.',
        timestamp: new Date('2026-01-01T10:00:00'),
      },
      {
        role: 'assistant',
        content: 'I have led several Angular projects.',
        timestamp: new Date('2026-01-01T10:01:00'),
      },
    ]);
    fixture.detectChanges();
  });

  it('renders recruiter and assistant labels', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Recruiter question');
    expect(text).toContain('AI twin response');
  });
});
