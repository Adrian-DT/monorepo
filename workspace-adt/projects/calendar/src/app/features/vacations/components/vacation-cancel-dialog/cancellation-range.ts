export type CancellationScope = 'ALL' | 'PARTIAL';

export interface CancellationRangeInput {
  scope: CancellationScope;
  fromDate: string;
  toDate: string;
  periodStart: string;
  periodEnd: string;
  minDate: string;
}

export function todayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function laterDate(first: string, second: string): string {
  return first >= second ? first : second;
}

export function validateCancellationRange(input: CancellationRangeInput): string {
  if (input.scope === 'ALL') {
    return input.minDate > input.periodEnd
      ? 'Las vacaciones ya han terminado, no quedan días por cancelar.'
      : '';
  }

  if (!input.fromDate || !input.toDate) {
    return 'Indica la fecha inicial y la fecha final del tramo a cancelar.';
  }

  if (input.toDate < input.fromDate) {
    return 'La fecha final no puede ser anterior a la fecha inicial.';
  }

  if (input.fromDate < input.periodStart || input.toDate > input.periodEnd) {
    return `Las fechas deben estar entre ${input.periodStart} y ${input.periodEnd}.`;
  }

  if (input.fromDate < input.minDate) {
    return `No se pueden cancelar días anteriores al ${input.minDate}.`;
  }

  return '';
}
