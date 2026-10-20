import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  status: number;
  code?: string;
  field?: string;
  fields?: Record<string, string>;
  detail?: string;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = (error.error ?? {}) as Partial<ApiError>;

    return {
      status: error.status,
      code: body.code,
      field: body.field,
      fields: body.fields,
      detail: body.detail,
    };
  }

  return { status: 0 };
}
