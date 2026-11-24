import { LoadingState } from '@core/http/call-state';
import { EventDetail } from '../models/event.models';
import { eventFixture, summaryFixture } from '../testing/event.fixtures';
import { EventsApiActions, EventsPageActions } from './events.actions';
import { State, eventsFeature, eventsReducer, initialState } from './events.reducer';

const conflict = { status: 409, code: 'events.item-full', message: 'Someone was quicker.', fieldErrors: [] };
const run = (state: State, ...actions: Parameters<typeof eventsReducer>[1][]) => actions.reduce(eventsReducer, state);
const page = (items: ReturnType<typeof summaryFixture>[], n: number, totalItems: number) =>
  EventsApiActions.eventsLoaded({ page: { items, page: n, size: 20, totalItems } });

describe('events reducer', () => {
  describe('list and paging', () => {
    it('stores the first page sorted by start', () => {
      const later = summaryFixture({ id: 'b', startsAt: '2027-03-01T10:00:00Z' });
      const sooner = summaryFixture({ id: 'a', startsAt: '2027-02-01T10:00:00Z' });
      const state = run(initialState, page([later, sooner], 0, 2));

      expect(state.listCallState).toBe(LoadingState.LOADED);
      expect(eventsFeature.selectEventList.projector(state).map((e) => e.id)).toEqual(['a', 'b']);
      expect(eventsFeature.selectHasMore.projector(state.ids, state.totalItems)).toBe(false);
    });

    it('appends later pages and knows when there is more', () => {
      const first = Array.from({ length: 20 }, (_, i) => summaryFixture({ id: `p0-${i}` }));
      const second = Array.from({ length: 20 }, (_, i) => summaryFixture({ id: `p1-${i}` }));
      const afterOne = run(initialState, page(first, 0, 55));
      expect(eventsFeature.selectHasMore.projector(afterOne.ids, afterOne.totalItems)).toBe(true);

      const afterTwo = run(afterOne, EventsPageActions.loadMoreEvents(), page(second, 1, 55));
      expect(afterTwo.ids).toHaveLength(40);
      expect(afterTwo.page).toBe(1);

      // Reloading starts over from page 0.
      const reloaded = run(afterTwo, EventsPageActions.loadEvents(), page(first.slice(0, 5), 0, 5));
      expect(reloaded.ids).toHaveLength(5);
    });
  });

  describe('pending changes', () => {
    const loaded = run(initialState, EventsPageActions.openEvent({ eventId: 'e-1' }), EventsApiActions.eventLoaded({ event: eventFixture() }));

    it('tracks overlapping changes separately', () => {
      const state = run(loaded,
        EventsPageActions.claimItem({ eventId: 'e-1', itemId: 'i-1' }),
        EventsPageActions.claimItem({ eventId: 'e-1', itemId: 'i-2' }),
        EventsPageActions.setRsvp({ eventId: 'e-1', status: 'GOING' }),
      );
      expect(state.pending).toEqual(['item:i-1', 'item:i-2', 'rsvp:e-1']);

      const oneDone = run(state, EventsApiActions.eventChanged({ key: 'item:i-1', event: eventFixture() }));
      expect(oneDone.pending).toEqual(['item:i-2', 'rsvp:e-1']);

      const oneFailed = run(oneDone, EventsApiActions.changeFailed({ key: 'item:i-2', eventId: 'e-1', error: conflict }));
      expect(oneFailed.pending).toEqual(['rsvp:e-1']);
      expect(oneFailed.error).toEqual(conflict);

      expect(run(oneFailed, EventsApiActions.eventChanged({ key: 'rsvp:e-1', event: eventFixture() })).pending).toEqual([]);
    });

    it('keeps an item pending until every queued change on it has finished', () => {
      const state = run(loaded,
        EventsPageActions.claimItem({ eventId: 'e-1', itemId: 'i-1' }),
        EventsPageActions.unclaimItem({ eventId: 'e-1', itemId: 'i-1' }),
        EventsApiActions.eventChanged({ key: 'item:i-1', event: eventFixture() }),
      );
      expect(state.pending).toEqual(['item:i-1']);
      expect(run(state, EventsApiActions.eventChanged({ key: 'item:i-1', event: eventFixture() })).pending).toEqual([]);
    });

    it('a refresh after a conflict leaves pending changes alone', () => {
      const state = run(loaded, EventsPageActions.setRsvp({ eventId: 'e-1', status: 'MAYBE' }), EventsApiActions.eventRefreshed({ event: eventFixture() }));
      expect(state.pending).toEqual(['rsvp:e-1']);
    });
  });

  describe('navigating while a change is running', () => {
    const other: EventDetail = eventFixture({ id: 'e-2', title: 'Seed swap' });

    it('does not let a late answer for the old event replace the new page', () => {
      const state = run(initialState,
        page([summaryFixture()], 0, 1),
        EventsPageActions.openEvent({ eventId: 'e-1' }),
        EventsApiActions.eventLoaded({ event: eventFixture() }),
        EventsPageActions.claimItem({ eventId: 'e-1', itemId: 'i-1' }),
        EventsPageActions.openEvent({ eventId: 'e-2' }),
        EventsApiActions.eventChanged({ key: 'item:i-1', event: eventFixture({ myRsvp: 'GOING' }) }),
      );

      expect(state.selectedId).toBe('e-2');
      expect(state.selected).toBeNull();
      expect(state.detailCallState).toBe(LoadingState.LOADING);
      expect(state.pending).toEqual([]);
      expect(state.entities['e-1']?.myRsvp).toBe('GOING');

      const shown = run(state, EventsApiActions.eventLoaded({ event: other }));
      expect(shown.selected?.title).toBe('Seed swap');
      expect(shown.detailCallState).toBe(LoadingState.LOADED);
    });

    it('ignores a late load error for an event that is no longer open', () => {
      const state = run(initialState,
        EventsPageActions.openEvent({ eventId: 'e-1' }),
        EventsPageActions.openEvent({ eventId: 'e-2' }),
        EventsApiActions.eventLoadFailed({ eventId: 'e-1', error: { ...conflict, status: 404 } }),
      );
      expect(state.detailCallState).toBe(LoadingState.LOADING);
    });

    it('remembers which event a failed change was about', () => {
      const state = run(initialState,
        EventsPageActions.openEvent({ eventId: 'e-2' }),
        EventsApiActions.changeFailed({ key: 'item:i-1', eventId: 'e-1', error: conflict }),
      );
      expect(state.errorEventId).toBe('e-1');
      expect(run(state, EventsPageActions.dismissError()).error).toBeNull();
    });
  });

  it('shows a changed event on the page and in the list, without detail fields in the list', () => {
    const state = run(initialState,
      page([summaryFixture()], 0, 1),
      EventsPageActions.openEvent({ eventId: 'e-1' }),
      EventsApiActions.eventChanged({ key: 'rsvp:e-1', event: eventFixture({ myRsvp: 'GOING' }) }),
    );
    expect(state.selected?.myRsvp).toBe('GOING');
    expect(state.entities['e-1']?.myRsvp).toBe('GOING');
    expect(state.entities['e-1']).not.toHaveProperty('bringItems');
  });

  it('removes a cancelled event and counts it out', () => {
    const state = run(initialState,
      page([summaryFixture()], 0, 1),
      EventsPageActions.openEvent({ eventId: 'e-1' }),
      EventsApiActions.eventLoaded({ event: eventFixture() }),
      EventsApiActions.eventCancelled({ eventId: 'e-1' }),
    );
    expect(state.ids).toEqual([]);
    expect(state.totalItems).toBe(0);
    expect(state.selected).toBeNull();
  });
});
