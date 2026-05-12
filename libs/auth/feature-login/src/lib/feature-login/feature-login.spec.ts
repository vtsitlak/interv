import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeatureLogin } from './feature-login';

describe('FeatureLogin', () => {
  let component: FeatureLogin;
  let fixture: ComponentFixture<FeatureLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureLogin],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
