import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatDate,
  formatRelativeTime,
  getPriorityTier,
  STATUS_MAP,
  URGENCY_MAP,
} from '../src/utils/formatters.js';

describe('formatters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns a dash for an empty date and formats a valid date in Indonesian', () => {
    expect(formatDate('')).toBe('-');
    expect(formatDate('2025-01-02T03:04:00.000Z')).toContain('2025');
  });

  it('returns the original date if date formatting throws', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new RangeError('unsupported locale');
    });

    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('handles empty relative dates', () => {
    expect(formatRelativeTime('')).toBe('');
  });

  it.each([
    [10, 'Baru saja'],
    [120, '2 menit lalu'],
    [7200, '2 jam lalu'],
    [172800, '2 hari lalu'],
  ])('formats a date %i seconds old', (seconds, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-10T12:00:00.000Z'));
    const date = new Date(Date.now() - seconds * 1000).toISOString();

    expect(formatRelativeTime(date)).toBe(expected);
  });

  it('uses the date formatter for dates older than the relative day range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T12:00:00.000Z'));
    expect(formatRelativeTime('2025-01-01T12:00:00.000Z')).toContain('2025');
  });

  it('returns the original date when relative-time formatting throws', () => {
    const originalDate = globalThis.Date;
    vi.stubGlobal('Date', class BrokenDate extends originalDate {
      constructor(value) {
        if (value !== undefined) throw new RangeError('invalid date');
        super();
      }
    });

    expect(formatRelativeTime('bad-date')).toBe('bad-date');
  });

  it.each([
    [0, 'Prioritas Rendah', 'priority-low'],
    [39.9, 'Prioritas Rendah', 'priority-low'],
    [40, 'Prioritas Sedang', 'priority-medium'],
    [60, 'Prioritas Tinggi', 'priority-high'],
    [80, 'Prioritas Utama', 'priority-critical'],
    ['invalid', 'Prioritas Rendah', 'priority-low'],
  ])('maps priority score %s', (score, label, tierClass) => {
    expect(getPriorityTier(score)).toEqual({ label, tierClass });
  });

  it('exposes all statuses and urgency levels with their UI labels', () => {
    expect(Object.keys(STATUS_MAP)).toEqual([
      'diajukan',
      'diverifikasi',
      'diproses',
      'selesai',
      'ditolak',
    ]);
    expect(STATUS_MAP.diajukan.label).toBe('Diajukan');
    expect(URGENCY_MAP).toEqual({
      rendah: { label: 'Rendah', badgeClass: 'urgency-rendah' },
      sedang: { label: 'Sedang', badgeClass: 'urgency-sedang' },
      tinggi: { label: 'Tinggi', badgeClass: 'urgency-tinggi' },
      kritis: { label: 'Kritis', badgeClass: 'urgency-kritis' },
    });
  });
});
