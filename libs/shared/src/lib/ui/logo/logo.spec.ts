import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LogoComponent } from './logo';

describe('LogoComponent', () => {
  let fixture: ComponentFixture<LogoComponent>;
  let component: LogoComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the wordmark by default', () => {
    const wordmark = fixture.nativeElement.querySelector('span');
    expect(wordmark?.textContent?.trim()).toBe('Interv');
  });

  it('hides the wordmark when showWordmark is false', () => {
    fixture.componentRef.setInput('showWordmark', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('span')).toBeNull();
    expect(fixture.nativeElement.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Interv',
    );
  });

  it('uses a custom wordmark label', () => {
    fixture.componentRef.setInput('wordmark', 'Interv Beta');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('span')?.textContent?.trim()).toBe(
      'Interv Beta',
    );
  });
});
