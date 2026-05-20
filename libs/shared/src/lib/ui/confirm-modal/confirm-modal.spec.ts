import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmModalComponent } from './confirm-modal';

describe('ConfirmModalComponent', () => {
  let fixture: ComponentFixture<ConfirmModalComponent>;
  let component: ConfirmModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', 'Are you sure?');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not render when closed', () => {
    expect(fixture.nativeElement.querySelector('.modal')).toBeNull();
  });

  it('renders when open and emits confirmed', () => {
    const confirmed = vi.spyOn(component.confirmed, 'emit');
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.modal');
    expect(modal).toBeTruthy();

    component.onConfirm();
    expect(confirmed).toHaveBeenCalled();
  });

  it('emits cancelled', () => {
    const cancelled = vi.spyOn(component.cancelled, 'emit');

    component.onCancel();

    expect(cancelled).toHaveBeenCalled();
  });

  it('emits cancelled when backdrop is clicked', () => {
    const cancelled = vi.spyOn(component.cancelled, 'emit');
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.modal') as HTMLElement;
    component.onBackdropClick({
      target: modal,
      currentTarget: modal,
    } as MouseEvent);

    expect(cancelled).toHaveBeenCalled();
  });

  it('does not emit while confirming', () => {
    const confirmed = vi.spyOn(component.confirmed, 'emit');
    const cancelled = vi.spyOn(component.cancelled, 'emit');
    fixture.componentRef.setInput('isConfirming', true);
    fixture.detectChanges();

    component.onConfirm();
    component.onCancel();

    expect(confirmed).not.toHaveBeenCalled();
    expect(cancelled).not.toHaveBeenCalled();
  });
});
