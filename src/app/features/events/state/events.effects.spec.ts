import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, firstValueFrom, of, throwError, toArray } from 'rxjs';
import { PlatformApiService } from '@core/platform/platform-api.service';
import { EventsApiService } from '../data-access/events-api.service';
import { eventFixture } from '../testing/event.fixtures';
import { EventsApiActions, EventsPageActions } from './events.actions';
import { EventsEffects } from './events.effects';

describe('EventsEffects', () => {
  let actions$: Observable<Action>;
  let effects: EventsEffects;
  const api = {
    setRsvp: vi.fn(),
    claimItem: vi.fn(),
    getEvent: vi.fn(),
    createEvent: vi.fn(),
  };
  const router = { navigate: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        EventsEffects,
        provideMockActions(() => actions$),
        { provide: EventsApiService, useValue: api },
        { provide: PlatformApiService, useValue: {} },
        { provide: Router, useValue: router },
      ],
    });
    effects = TestBed.inject(EventsEffects);
  });

  it('sends an RSVP and shows the event the API answers with', async () => {
    const event = eventFixture({ myRsvp: 'MAYBE' });
    api.setRsvp.mockReturnValue(of(event));
    actions$ = of(EventsPageActions.setRsvp({ eventId: 'e-1', status: 'MAYBE' }));

    expect(await firstValueFrom(effects.changeEvent$)).toEqual(EventsApiActions.eventChanged({ event }));
    expect(api.setRsvp).toHaveBeenCalledWith('e-1', 'MAYBE');
  });

  it('turns a problem response into an ApiError with its code', async () => {
    api.claimItem.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { title: 'Already taken', status: 409, code: 'events.item-full', detail: 'Someone was quicker.' },
    })));
    actions$ = of(EventsPageActions.claimItem({ eventId: 'e-1', itemId: 'i-1' }));

    const action = await firstValueFrom(effects.changeEvent$);
    expect(action).toEqual(EventsApiActions.changeFailed({
      eventId: 'e-1',
      error: { status: 409, code: 'events.item-full', message: 'Someone was quicker.', fieldErrors: [] },
    }));
  });

  it('reloads the event after a conflict so the page shows who was quicker', async () => {
    const event = eventFixture();
    api.getEvent.mockReturnValue(of(event));
    actions$ = of(
      EventsApiActions.changeFailed({ eventId: 'e-1', error: { status: 409, code: 'x', message: '', fieldErrors: [] } }),
      EventsApiActions.changeFailed({ eventId: 'e-1', error: { status: 400, code: 'x', message: '', fieldErrors: [] } }),
    );

    expect(await firstValueFrom(effects.reloadAfterConflict$.pipe(toArray()))).toEqual([EventsApiActions.eventChanged({ event })]);
  });

  it('opens the new event after creating it', async () => {
    const event = eventFixture({ id: 'new' });
    api.createEvent.mockReturnValue(of(event));
    actions$ = of(EventsPageActions.createEvent({ input: {} as never }));
    expect(await firstValueFrom(effects.createEvent$)).toEqual(EventsApiActions.eventSaved({ event }));

    actions$ = of(EventsApiActions.eventSaved({ event }));
    await firstValueFrom(effects.navigateAfterSave$);
    expect(router.navigate).toHaveBeenCalledWith(['/events', 'new']);
  });
});
