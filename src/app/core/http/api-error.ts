import { HttpErrorResponse } from '@angular/common/http';
import type { ApiSchemas } from '../api';

export type Problem = ApiSchemas['Problem'];

/**
 * An API failure as the UI needs it: the HTTP status, the backend's stable
 * problem code (for example `events.item-full`) and any field errors.
 */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  fieldErrors: { field: string; message: string }[];
}

/** Turns an HttpErrorResponse into an ApiError, keeping the RFC 9457 problem body when there is one. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const problem = isProblem(error.error) ? error.error : null;
    return {
      status: error.status,
      code: problem?.code ?? (error.status === 0 ? 'common.offline' : `http.${error.status}`),
      message: problem?.detail ?? problem?.title ?? fallbackMessage(error.status),
      fieldErrors: problem?.fieldErrors ?? [],
    };
  }
  return {
    status: 0,
    code: 'common.unknown',
    message: error instanceof Error ? error.message : 'Something went wrong.',
    fieldErrors: [],
  };
}

function isProblem(body: unknown): body is Problem {
  return typeof body === 'object' && body !== null && 'status' in body && 'title' in body;
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 0: return 'Could not reach Samvær. Check your connection.';
    case 401: return 'Please sign in again.';
    case 403: return 'You are not allowed to do that.';
    case 404: return 'This is gone, or you do not have access to it.';
    case 409: return 'Someone changed this just now. Reload and try again.';
    default: return 'Something went wrong. Please try again.';
  }
}
