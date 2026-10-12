import { describe, it, expect, vi } from 'vitest';

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    execSync: vi.fn(),
    runSync: vi.fn(),
    getFirstSync: vi.fn(),
    getAllSync: vi.fn(() => []),
  }),
}));

import { formatSecondsToTimerString } from '../src/services/timer';

describe('Timer Service Logic', () => {
  it('formats seconds into MM:SS format correctly for < 1 hour', () => {
    expect(formatSecondsToTimerString(0)).toBe('00:00');
    expect(formatSecondsToTimerString(59)).toBe('00:59');
    expect(formatSecondsToTimerString(60)).toBe('01:00');
    expect(formatSecondsToTimerString(125)).toBe('02:05');
  });

  it('formats seconds into HH:MM:SS format correctly for >= 1 hour', () => {
    expect(formatSecondsToTimerString(3600)).toBe('01:00:00');
    expect(formatSecondsToTimerString(3665)).toBe('01:01:05');
    expect(formatSecondsToTimerString(7322)).toBe('02:02:02');
  });
});
