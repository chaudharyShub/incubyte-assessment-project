import { describe, expect, it } from 'vitest';
import { formatCompactInr, formatDate, formatMoney, todayIsoDate } from './format';

describe('formatMoney', () => {
  it('groups rupees the Indian way, in lakhs', () => {
    expect(formatMoney('106500.00', 'INR')).toBe('₹1,06,500');
  });

  it('groups other currencies in thousands', () => {
    expect(formatMoney('17950.00', 'USD')).toBe('$17,950');
    expect(formatMoney('1250000.00', 'USD')).toBe('$1,250,000');
  });

  it('shows two decimals only when the amount has a fractional part', () => {
    expect(formatMoney('4200.50', 'GBP')).toBe('£4,200.50');
    expect(formatMoney('4200.00', 'GBP')).toBe('£4,200');
  });
});

describe('formatMoney without decimals', () => {
  it('rounds to whole units', () => {
    expect(formatMoney('106159.25', 'INR', { decimals: false })).toBe('₹1,06,159');
  });
});

describe('formatCompactInr', () => {
  it.each([
    [86500, '₹86.5K'],
    [106159, '₹1.06L'],
    [3748093400, '₹374.81Cr'],
    [0, '₹0'],
  ])('writes %d as %s', (amount, expected) => {
    expect(formatCompactInr(amount)).toBe(expected);
  });
});

describe('formatDate', () => {
  it('writes the date out in words', () => {
    expect(formatDate('2024-11-22')).toBe('22 Nov 2024');
  });

  it('keeps the first day of a month on that day', () => {
    expect(formatDate('2025-01-01')).toBe('1 Jan 2025');
  });
});

describe('todayIsoDate', () => {
  it('uses the local calendar date, zero-padded', () => {
    expect(todayIsoDate(new Date(2026, 2, 5, 23, 30))).toBe('2026-03-05');
  });
});
