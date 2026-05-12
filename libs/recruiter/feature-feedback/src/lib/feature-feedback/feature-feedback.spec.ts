import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeatureFeedback } from './feature-feedback';

describe('FeatureFeedback', () => {
  let component: FeatureFeedback;
  let fixture: ComponentFixture<FeatureFeedback>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureFeedback],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureFeedback);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
