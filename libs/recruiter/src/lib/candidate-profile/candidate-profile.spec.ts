import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CandidateProfileComponent } from './candidate-profile';

describe('CandidateProfileComponent', () => {
  let component: CandidateProfileComponent;
  let fixture: ComponentFixture<CandidateProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateProfileComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CandidateProfileComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
