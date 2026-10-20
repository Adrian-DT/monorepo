import { toApiError } from '../../../core/http/api-error';

const MESSAGES: Record<string, string> = {
  OVERLAP: 'Ya tienes una solicitud pendiente o aprobada que incluye alguna de esas fechas.',
  NO_WORKING_DAYS: 'El periodo seleccionado no incluye ningún día laborable.',
  RANGE_OUTSIDE_PERIOD: 'Las fechas deben estar dentro del periodo de las vacaciones.',
  PAST_DATES: 'No se pueden cancelar días que ya han pasado. Contacta con un administrador.',
  CANCELLATION_ALREADY_REQUESTED: 'Ya hay una solicitud de cancelación pendiente para estas vacaciones.',
  CANCELLATION_REQUEST_PENDING:
    'Hay una solicitud de cancelación pendiente. Resuélvela antes de cancelar directamente.',
  INVALID_STATUS: 'La solicitud ha cambiado de estado y ya no admite esta operación.',
  CANCELLATION_NOT_FOUND: 'La solicitud de cancelación ya no existe.',
  VACATION_NOT_FOUND: 'La solicitud de vacaciones ya no existe.',
};

export function describeVacationError(error: unknown, fallback: string): string {
  const apiError = toApiError(error);

  if (apiError.code && MESSAGES[apiError.code]) {
    return MESSAGES[apiError.code];
  }

  if (apiError.status === 400) {
    return 'Los datos introducidos no son válidos.';
  }

  return fallback;
}
