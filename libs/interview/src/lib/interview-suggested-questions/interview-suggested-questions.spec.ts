import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewSuggestedQuestionsComponent } from './interview-suggested-questions';

describe('InterviewSuggestedQuestionsComponent', () => {
  let fixture: ComponentFixture<InterviewSuggestedQuestionsComponent>;
  let component: InterviewSuggestedQuestionsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewSuggestedQuestionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InterviewSuggestedQuestionsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('questions', [
      'Tell me about your experience.',
      'What is your biggest strength?',
    ]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows chips when visible inputs allow', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(2);
  });

  it('shows loading state while suggestions load', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Preparing suggestions');
  });

  it('emits questionSelected when a chip is clicked', () => {
    const spy = vi.fn();
    component.questionSelected.subscribe(spy);
    fixture.componentRef.setInput('canSendMessage', true);
    fixture.detectChanges();

    component.onSelect('Tell me about your experience.');

    expect(spy).toHaveBeenCalledWith('Tell me about your experience.');
  });

  it('does not emit when question is already used', () => {
    const spy = vi.fn();
    component.questionSelected.subscribe(spy);
    fixture.componentRef.setInput('usedKeys', ['tell me about your experience.']);
    fixture.detectChanges();

    component.onSelect('Tell me about your experience.');

    expect(spy).not.toHaveBeenCalled();
  });

  it('hides when interview is complete', () => {
    fixture.componentRef.setInput('isComplete', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
