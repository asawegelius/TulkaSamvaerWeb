import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './api-error';

describe('toApiError', () => {
  it('keeps the status, code and field errors of a problem body', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { title: 'Already taken', status: 409, code: 'events.item-full', detail: 'Someone was quicker.' },
    });

    expect(toApiError(error)).toEqual({
      status: 409,
      code: 'events.item-full',
      message: 'Someone was quicker.',
      fieldErrors: [],
    });
  });

  it('falls back to a readable message when the body is not a problem', () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

    expect(toApiError(error)).toMatchObject({ status: 0, code: 'common.offline' });
    expect(toApiError(error).message).toContain('connection');
  });

  it('handles plain errors', () => {
    expect(toApiError(new Error('boom'))).toMatchObject({ code: 'common.unknown', message: 'boom' });
  });
});
