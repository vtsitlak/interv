import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewFacade } from '@interv/state-interview';
import { FeatureInterview } from './feature-interview';

describe('FeatureInterview', () => {
  let component: FeatureInterview;
  let fixture: ComponentFixture<FeatureInterview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureInterview],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ profileId: 'p1' }) },
          },
        },
        {
          provide: InterviewFacade,
          useValue: {
            disconnect: vi.fn(),
            isConnecting: () => false,
            messages: () => [],
            isStreaming: () => false,
            canSendMessage: () => true,
            messageCount: () => 0,
            maxMessages: () => 8,
            error: () => null,
            startInterview: vi.fn().mockResolvedValue(undefined),
            sendMessage: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureInterview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
