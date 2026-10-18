import { describe, expect, it } from 'vitest';
import {
  isValidUsernameFormat,
  normalizeUsername,
  publicSharePathForUsername,
  usernameFormatError,
} from './username';

describe('username', () => {
  it('normalizes to lowercase trimmed', () => {
    expect(normalizeUsername('  Jane-Doe ')).toBe('jane-doe');
  });

  it('accepts valid handles', () => {
    expect(isValidUsernameFormat('abc')).toBe(true);
    expect(isValidUsernameFormat('jane-doe')).toBe(true);
    expect(isValidUsernameFormat('dev42')).toBe(true);
  });

  it('rejects short, reserved, and unsafe values', () => {
    expect(usernameFormatError('ab')).toContain('at least');
    expect(usernameFormatError('account')).toContain('reserved');
    expect(usernameFormatError('jane/doe')).toContain('lowercase');
    expect(usernameFormatError('jane doe')).toContain('lowercase');
    expect(usernameFormatError('-jane')).toContain('lowercase');
    expect(usernameFormatError('jane-')).toContain('lowercase');
  });

  it('builds share paths from normalized username', () => {
    expect(publicSharePathForUsername('Jane-Doe')).toBe('/candidate/jane-doe');
  });
});
