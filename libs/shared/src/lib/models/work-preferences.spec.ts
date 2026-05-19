import { describe, expect, it } from 'vitest';
import {
  formatWorkPreferencesList,
  normalizeWorkPreferences,
} from './work-preferences';

describe('normalizeWorkPreferences', () => {
  it('filters unknown values and preserves display order', () => {
    expect(
      normalizeWorkPreferences(['freelance', 'invalid', 'remote', 'hybrid']),
    ).toEqual(['remote', 'hybrid', 'freelance']);
  });
});

describe('formatWorkPreferencesList', () => {
  it('formats labels for overview text', () => {
    expect(
      formatWorkPreferencesList(['remote', 'full-time', 'contract']),
    ).toBe('Remote, Full-time, Contract');
  });
});
