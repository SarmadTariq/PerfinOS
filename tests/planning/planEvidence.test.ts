import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  currencyFractionDigits,
  fromMinorUnits,
  resolvePlanEvidencePeriod,
  toMinorUnits,
} from '../../src/planning/planEvidence';

describe('Plan evidence money rules', () => {
  it('resolves currency-specific fraction digits', () => {
    expect(currencyFractionDigits('CAD')).toBe(2);
    expect(currencyFractionDigits('JPY')).toBe(0);
    expect(currencyFractionDigits('KWD')).toBe(3);
  });

  it('normalizes lowercase currency codes', () => {
    expect(currencyFractionDigits('cad')).toBe(2);
  });

  it('converts major amounts to integer minor units', () => {
    expect(toMinorUnits(12.34, 'CAD')).toBe(1234);
    expect(toMinorUnits(123.6, 'JPY')).toBe(124);
    expect(toMinorUnits(1.234, 'KWD')).toBe(1234);
  });

  it('rounds midpoint values away from zero', () => {
    expect(toMinorUnits(1.005, 'CAD')).toBe(101);
    expect(toMinorUnits(-1.005, 'CAD')).toBe(-101);
  });

  it('converts integer minor units back to major amounts', () => {
    expect(fromMinorUnits(1234, 'CAD')).toBe(12.34);
    expect(fromMinorUnits(124, 'JPY')).toBe(124);
    expect(fromMinorUnits(1234, 'KWD')).toBe(1.234);
  });

  it('rejects invalid or unsafe money values', () => {
    expect(() =>
      toMinorUnits(
        Number.NaN,
        'CAD'
      )
    ).toThrow(
      'Money value must be finite'
    );

    expect(() =>
      fromMinorUnits(
        12.5,
        'CAD'
      )
    ).toThrow(
      'Minor-unit value must be a safe integer'
    );

    expect(() =>
      currencyFractionDigits('CA')
    ).toThrow(
      'Currency must be a three-letter code'
    );
  });
});

describe('Plan evidence horizon rules', () => {
  it('creates a seven-day rolling period ending on the anchor date', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: '7_days',
        anchorDate: '2026-07-21',
      })
    ).toEqual({
      kind: '7_days',
      startDate: '2026-07-15',
      endDate: '2026-07-21',
      monthKey: '2026-07',
      dayCount: 7,
      isCompleteCalendarMonth: false,
    });
  });

  it('creates a fourteen-day rolling period ending on the anchor date', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: '14_days',
        anchorDate: '2026-07-21',
      })
    ).toEqual({
      kind: '14_days',
      startDate: '2026-07-08',
      endDate: '2026-07-21',
      monthKey: '2026-07',
      dayCount: 14,
      isCompleteCalendarMonth: false,
    });
  });

  it('supports short periods that cross a month boundary', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: '7_days',
        anchorDate: '2026-08-03',
      })
    ).toMatchObject({
      startDate: '2026-07-28',
      endDate: '2026-08-03',
      monthKey: null,
      dayCount: 7,
    });
  });

  it('creates a current month-to-date period', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: 'current_month',
        anchorDate: '2026-07-21',
      })
    ).toEqual({
      kind: 'current_month',
      startDate: '2026-07-01',
      endDate: '2026-07-21',
      monthKey: '2026-07',
      dayCount: 21,
      isCompleteCalendarMonth: false,
    });
  });

  it('creates a complete selected past month', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2026-07-21',
        month: '2026-06',
      })
    ).toEqual({
      kind: 'calendar_month',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      monthKey: '2026-06',
      dayCount: 30,
      isCompleteCalendarMonth: true,
    });
  });

  it('handles leap-year selected months', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2024-03-15',
        month: '2024-02',
      })
    ).toMatchObject({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
      dayCount: 29,
      isCompleteCalendarMonth: true,
    });
  });

  it('treats a selected current month as month-to-date', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2026-07-21',
        month: '2026-07',
      })
    ).toEqual({
      kind: 'calendar_month',
      startDate: '2026-07-01',
      endDate: '2026-07-21',
      monthKey: '2026-07',
      dayCount: 21,
      isCompleteCalendarMonth: false,
    });
  });

  it('rejects future selected months', () => {
    expect(() =>
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2026-07-21',
        month: '2026-08',
      })
    ).toThrow(
      'Future calendar months are not supported'
    );
  });

  it('requires a month for selected-month evidence', () => {
    expect(() =>
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2026-07-21',
      })
    ).toThrow(
      'Calendar-month evidence requires a month'
    );
  });

  it('rejects invalid dates and month keys', () => {
    expect(() =>
      resolvePlanEvidencePeriod({
        kind: '7_days',
        anchorDate: '2026-02-30',
      })
    ).toThrow(
      'Anchor date must be a valid YYYY-MM-DD date'
    );

    expect(() =>
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2026-07-21',
        month: '2026-13',
      })
    ).toThrow(
      'Month must be a valid YYYY-MM value'
    );
  });
});
