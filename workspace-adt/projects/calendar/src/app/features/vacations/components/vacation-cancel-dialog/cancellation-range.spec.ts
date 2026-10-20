import {
  CancellationRangeInput,
  laterDate,
  todayIso,
  validateCancellationRange,
} from './cancellation-range';

function input(overrides: Partial<CancellationRangeInput> = {}): CancellationRangeInput {
  return {
    scope: 'PARTIAL',
    fromDate: '2026-11-05',
    toDate: '2026-11-06',
    periodStart: '2026-11-02',
    periodEnd: '2026-11-13',
    minDate: '2026-11-02',
    ...overrides,
  };
}

describe('validateCancellationRange', () => {
  it('accepts the whole period', () => {
    expect(validateCancellationRange(input({ scope: 'ALL', fromDate: '', toDate: '' }))).toBe('');
  });

  it('rejects the whole period when it has already ended', () => {
    expect(
      validateCancellationRange(input({ scope: 'ALL', minDate: '2026-11-20' })),
    ).toContain('ya han terminado');
  });

  it('accepts a valid partial range, including the period limits', () => {
    expect(validateCancellationRange(input())).toBe('');
    expect(
      validateCancellationRange(input({ fromDate: '2026-11-02', toDate: '2026-11-13' })),
    ).toBe('');
    expect(
      validateCancellationRange(input({ fromDate: '2026-11-05', toDate: '2026-11-05' })),
    ).toBe('');
  });

  it('requires both dates for a partial range', () => {
    expect(validateCancellationRange(input({ fromDate: '' }))).toContain('fecha inicial');
    expect(validateCancellationRange(input({ toDate: '' }))).toContain('fecha inicial');
  });

  it('rejects an inverted range', () => {
    expect(
      validateCancellationRange(input({ fromDate: '2026-11-09', toDate: '2026-11-06' })),
    ).toContain('no puede ser anterior');
  });

  it('rejects dates outside the vacation period', () => {
    expect(validateCancellationRange(input({ fromDate: '2026-11-01' }))).toContain('entre');
    expect(validateCancellationRange(input({ toDate: '2026-11-14' }))).toContain('entre');
  });

  it('rejects days before the minimum date (past days for users)', () => {
    expect(
      validateCancellationRange(
        input({ fromDate: '2026-11-03', toDate: '2026-11-06', minDate: '2026-11-05' }),
      ),
    ).toContain('anteriores al 2026-11-05');
  });
});

describe('cancellation date helpers', () => {
  it('formats today in local time as yyyy-mm-dd', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(todayIso(new Date(2026, 11, 31, 0, 5))).toBe('2026-12-31');
  });

  it('returns the later of two ISO dates', () => {
    expect(laterDate('2026-11-02', '2026-10-21')).toBe('2026-11-02');
    expect(laterDate('2026-10-21', '2026-11-02')).toBe('2026-11-02');
    expect(laterDate('2026-10-21', '2026-10-21')).toBe('2026-10-21');
  });
});
