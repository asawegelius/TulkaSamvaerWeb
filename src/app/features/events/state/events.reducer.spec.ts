import { LoadingState } from '@core/http/call-state';
import { eventFixture, summaryFixture } from '../testing/event.fixtures';
import { EventsApiActions, EventsPageActions } from './events.actions';
import { eventsFeature, eventsReducer, initialState } from './events.reducer';

const conflict = { status: 409, code: 'events.item-full', message: 'Someone was quicker.', fieldErrors: [] };

describe('events reducer', () => {
  it('stores the loaded page sorted by start', () => {
    const later = summaryFixture({ id: 'b', startsAt: '2027-03-01T10:00:00Z' });
    const sooner = summaryFixture({ id: 'a', startsAt: '2027-02-01T10:00:00Z' });
    const state = eventsReducer(initialState, EventsApiActions.eventsLoaded({ page: { items: [later, sooner], page: 0, size: 50, totalItems: 2 } }));

    expect(state.listCallState).toBe(LoadingState.LOADED);
    expect(eventsFeature.selectEventList.projector(state).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('shows a changed event on the page and in the list', () => {
    const loaded = eventsReducer(initialState, EventsApiActions.eventLoaded({ event: eventFixture() }));
    const pending = eventsReducer(loaded, EventsPageActions.setRsvp({ eventId: 'e-1', status: 'GOING' }));
    expect(pending.pending).toBe('rsvp');

    const changed = eventsReducer(pending, EventsApiActions.eventChanged({ event: eventFixture({ myRsvp: 'GOING' }) }));
    expect(changed.pending).toBeNull();
    expect(changed.selected?.myRsvp).toBe('GOING');
    expect(changed.entities['e-1']?.myRsvp).toBe('GOING');
    expect(changed.entities['e-1']).not.toHaveProperty('bringItems');
  });

  it('keeps the error of a failed change for the page to show', () => {
    const pending = eventsReducer(initialState, EventsPageActions.claimItem({ eventId: 'e-1', itemId: 'i-1' }));
    expect(pending.pending).toBe('item:i-1');

    const failed = eventsReducer(pending, EventsApiActions.changeFailed({ eventId: 'e-1', error: conflict }));
    expect(failed.pending).toBeNull();
    expect(failed.error).toEqual(conflict);
    expect(eventsReducer(failed, EventsPageActions.dismissError()).error).toBeNull();
  });

  it('removes a cancelled event', () => {
    const loaded = eventsReducer(initialState, EventsApiActions.eventLoaded({ event: eventFixture() }));
    const state = eventsReducer(loaded, EventsApiActions.eventCancelled({ eventId: 'e-1' }));
    expect(state.ids).toEqual([]);
    expect(state.selected).toBeNull();
  });
});
