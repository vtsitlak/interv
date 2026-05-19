import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RemainingCharsComponent } from './remaining-chars';

describe('RemainingCharsComponent', () => {
  let fixture: ComponentFixture<RemainingCharsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemainingCharsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RemainingCharsComponent);
    fixture.componentRef.setInput('maxLength', 10);
    fixture.detectChanges();
  });

  it('shows remaining character count', () => {
    fixture.componentRef.setInput('value', 'hello');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('5 characters remaining');
  });

  it('uses singular form for one character left', () => {
    fixture.componentRef.setInput('value', '123456789');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1 character remaining');
  });
});
