import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeatureProfile } from './feature-profile';

describe('FeatureProfile', () => {
  let component: FeatureProfile;
  let fixture: ComponentFixture<FeatureProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureProfile],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
