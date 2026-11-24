import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { Observable, Subject, firstValueFrom, of, throwError, toArray } from 'rxjs';
import { PlatformApiService } from '@core/platform/platform-api.service';
import { EventsApiService } from '../data-access/events-api.service';
import { EventDetail } from '../models/event.models';
import { eventFixture } from '../testing/event.fixtures';
import { EventsApiActions, EventsPageActions } from './events.actions';
import { EventsEffects } from './events.effects';
import { eventsFeature } from './events.reducer';

describe('EventsEffects', () => {
  let actions$: Observable<Action>;
  let effects: EventsEffects;
  let store: MockStore;
  const api = {
    listEvents: vi.fn(),
    setRsvp: vi.fn(),
    claimItem: vi.fn(),
    unclaimItem: vi.fn(),
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
        provideMockStore({ selectors: [{ selector: eventsFeature.selectPage, value: 0 }] }),
        { provide: EventsApiService, useValue: api },
        { provide: PlatformApiService, useValue: {} },
        { provide: Router, useValue: router },
      ],
    });
    effects = TestBed.inject(EventsEffects);
    store = TestBed.inject(MockStore);
  });

  it('loads the first page, then the next one', async () => {
    const result = { items: [], page: 0, size: 20, totalItems: 55 };
    api.listEvents.mockReturnValue(of(result));

    actions$ = of(EventsPageActions.loadEvents());
    expect(await firstValueFrom(effects.loadEvents$)).toEqual(EventsApiActions.eventsLoaded({ page: result }));
    expect(api.listEvents).toHaveBeenLastCalledWith({ page: 0, size: 20 });

    store.overrideSelector(eventsFeature.selectPage, 1);
    store.refreshState();
    actions$ = of(EventsPageActions.loadMoreEvents());
    await firstValueFrom(effects.loadMoreEvents$);
    expect(api.listEvents).toHaveBeenLastCalledWith({ page: 2, size: 20 });
  });

  it('sends an RSVP and returns the event with its pending key', async () => {
    const event = eventFixture({ myRsvp: 'MAYBE' });
    api.setRsvp.mockReturnValue(of(event));
    actions$ = of(EventsPageActions.setRsvp({ eventId: 'e-1', status: 'MAYBE' }));

    expect(await firstValueFrom(effects.changeEvent$)).toEqual(EventsApiActions.eventChanged({ key: 'rsvp:e-1', event }));
    expect(api.setRsvp).toHaveBeenCalledWith('e-1', 'MAYBE');
  });

  it('runs overlapping changes one at a time, in order, each with its own key', () => {
    const claim = new Subject<EventDetail>();
    const unclaim = new Subject<EventDetail>();
    api.claimItem.mockReturnValue(claim);
    api.unclaimItem.mockReturnValue(unclaim);
    const actions = new Subject<Action>();
    actions$ = actions;
    const out: Action[] = [];
    effects.changeEvent$.subscribe((a) => out.push(a));

    actions.next(EventsPageActions.claimItem({ eventId: 'e-1', itemId: 'i-1' }));
    actions.next(EventsPageActions.unclaimItem({ eventId: 'e-1', itemId: 'i-1' }));
    // The second request is queued until the first answers.
    expect(api.claimItem).toHaveBeenCalledTimes(1);
    expect(api.unclaimItem).not.toHaveBeenCalled();

    claim.next(eventFixture({ title: 'after claim' }));
    claim.complete();
    expect(api.unclaimItem).toHaveBeenCalledTimes(1);
    unclaim.error(new HttpErrorResponse({ status: 500 }));

    expect(out).toEqual([
      EventsApiActions.eventChanged({ key: 'item:i-1', event: eventFixture({ title: 'after claim' }) }),
      EventsApiActions.changeFailed({ key: 'item:i-1', eventId: 'e-1', error: expect.objectContaining({ status: 500 }) as never }),
    ]);
  });

  it('turns a problem response into an ApiError with its code', async () => {
    api.claimItem.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { title: 'Already taken', status: 409, code: 'events.item-full', detail: 'Someone was quicker.' },
    })));
    actions$ = of(EventsPageActions.claimItem({ eventId: 'e-1', itemId: 'i-1' }));

    expect(await firstValueFrom(effects.changeEvent$)).toEqual(EventsApiActions.changeFailed({
      key: 'item:i-1',
      eventId: 'e-1',
      error: { status: 409, code: 'events.item-full', message: 'Someone was quicker.', fieldErrors: [] },
    }));
  });

  it('refreshes the event after a conflict without touching pending changes', async () => {
    const event = eventFixture();
    api.getEvent.mockReturnValue(of(event));
    actions$ = of(
      EventsApiActions.changeFailed({ key: 'item:i-1', eventId: 'e-1', error: { status: 409, code: 'x', message: '', fieldErrors: [] } }),
      EventsApiActions.changeFailed({ key: 'item:i-1', eventId: 'e-1', error: { status: 400, code: 'x', message: '', fieldErrors: [] } }),
    );

    expect(await firstValueFrom(effects.reloadAfterConflict$.pipe(toArray()))).toEqual([EventsApiActions.eventRefreshed({ event })]);
  });

  it('reports which event failed to load', async () => {
    api.getEvent.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    actions$ = of(EventsPageActions.openEvent({ eventId: 'gone' }));
    expect(await firstValueFrom(effects.openEvent$)).toMatchObject({ eventId: 'gone', error: { status: 404 } });
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
