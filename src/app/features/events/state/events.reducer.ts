import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { CallState, LoadingState, getError } from '@core/http/call-state';
import type { ApiError } from '@core/http/api-error';
import type { Group, MemberRef } from '@core/platform/platform-api.service';
import { EventDetail, EventSummary } from '../models/event.models';
import { EventsApiActions, EventsPageActions } from './events.actions';
import { pendingKeys, withoutOnce } from './pending-keys';

export const eventsFeatureKey = 'events';

export const eventAdapter = createEntityAdapter<EventSummary>({
  sortComparer: (a, b) => a.startsAt.localeCompare(b.startsAt),
});
const entitySelectors = eventAdapter.getSelectors();

export interface State extends EntityState<EventSummary> {
  listCallState: CallState;
  /** Paging from the last loaded page. */
  page: number;
  size: number;
  totalItems: number;
  selectedId: string | null;
  selected: EventDetail | null;
  detailCallState: CallState;
  /**
   * Keys of changes that are running or queued (see pending-keys.ts).
   * A key appears once per change, so overlapping changes keep it until the last one finishes.
   */
  pending: string[];
  saving: boolean;
  /** The last failed change, and the event it was about (null for list-wide errors). */
  error: ApiError | null;
  errorEventId: string | null;
  groups: Group[];
  members: MemberRef[];
}

export const PAGE_SIZE = 20;

export const initialState: State = eventAdapter.getInitialState({
  listCallState: LoadingState.INIT,
  page: -1,
  size: PAGE_SIZE,
  totalItems: 0,
  selectedId: null,
  selected: null,
  detailCallState: LoadingState.INIT,
  pending: [],
  saving: false,
  error: null,
  errorEventId: null,
  groups: [],
  members: [],
});

/** Keeps only the summary fields when an event goes into the list. */
function toSummary(event: EventDetail): EventSummary {
  const { description, attendees, bringItems, programme, sleeping, version, ...summary } = event;
  return summary;
}

/**
 * Shows an event the API sent. The list gets it when it holds that event; the
 * open page only when it is the event being shown, so a late answer for another event never
 * replaces the page the member navigated to.
 */
function showEvent(state: State, event: EventDetail): State {
  const withSummary = state.entities[event.id] ? eventAdapter.upsertOne(toSummary(event), state) : state;
  return event.id === state.selectedId
    ? { ...withSummary, selected: event, detailCallState: LoadingState.LOADED }
    : withSummary;
}

const addPending = (state: State, key: string): State => ({ ...state, pending: [...state.pending, key] });

export const eventsReducer = createReducer(
  initialState,
  on(EventsPageActions.loadEvents, (state): State => ({ ...state, listCallState: LoadingState.LOADING })),
  on(EventsPageActions.loadMoreEvents, (state): State => ({ ...state, listCallState: LoadingState.LOADING })),
  on(EventsApiActions.eventsLoaded, (state, { page }): State => {
    const next = { ...state, listCallState: LoadingState.LOADED, page: page.page, size: page.size, totalItems: page.totalItems };
    return page.page === 0 ? eventAdapter.setAll(page.items, next) : eventAdapter.upsertMany(page.items, next);
  }),
  on(EventsApiActions.eventsLoadFailed, (state, { error }): State => ({ ...state, listCallState: { errorMsg: error.message } })),

  on(EventsPageActions.openEvent, (state, { eventId }): State => ({
    ...state,
    selectedId: eventId,
    selected: state.selected?.id === eventId ? state.selected : null,
    detailCallState: LoadingState.LOADING,
  })),
  on(EventsApiActions.eventLoaded, (state, { event }): State => showEvent(state, event)),
  on(EventsApiActions.eventLoadFailed, (state, { eventId, error }): State =>
    eventId === state.selectedId ? { ...state, detailCallState: { errorMsg: error.message } } : state),

  on(EventsPageActions.setRsvp, (state, { eventId }): State => addPending(state, pendingKeys.rsvp(eventId))),
  on(EventsPageActions.claimItem, EventsPageActions.unclaimItem, EventsPageActions.removeBringItem,
    (state, { itemId }): State => addPending(state, pendingKeys.item(itemId))),
  on(EventsPageActions.addBringItem, (state, { eventId }): State => addPending(state, pendingKeys.addItem(eventId))),
  on(EventsApiActions.eventChanged, (state, { key, event }): State =>
    showEvent({ ...state, pending: withoutOnce(state.pending, key) }, event)),
  on(EventsApiActions.eventRefreshed, (state, { event }): State => showEvent(state, event)),
  on(EventsApiActions.changeFailed, (state, { key, eventId, error }): State => ({
    ...state,
    pending: withoutOnce(state.pending, key),
    error,
    errorEventId: eventId,
  })),

  on(EventsPageActions.createEvent, EventsPageActions.updateEvent, EventsPageActions.cancelEvent,
    (state): State => ({ ...state, saving: true, error: null, errorEventId: null })),
  on(EventsApiActions.eventSaved, (state, { event }): State =>
    ({ ...showEvent({ ...state, selectedId: event.id }, event), saving: false })),
  on(EventsApiActions.saveFailed, (state, { error }): State => ({ ...state, saving: false, error, errorEventId: null })),
  on(EventsApiActions.eventCancelled, (state, { eventId }): State =>
    eventAdapter.removeOne(eventId, {
      ...state,
      saving: false,
      totalItems: Math.max(0, state.totalItems - 1),
      ...(state.selectedId === eventId ? { selectedId: null, selected: null } : {}),
    })),

  on(EventsApiActions.formOptionsLoaded, (state, { groups, members }): State => ({ ...state, groups, members })),
  on(EventsApiActions.formOptionsFailed, (state, { error }): State => ({ ...state, error, errorEventId: null })),
  on(EventsPageActions.dismissError, (state): State => ({ ...state, error: null, errorEventId: null })),
);

export const eventsFeature = createFeature({
  name: eventsFeatureKey,
  reducer: eventsReducer,
  extraSelectors: ({ selectEventsState, selectListCallState, selectDetailCallState, selectIds, selectTotalItems }) => ({
    selectEventList: createSelector(selectEventsState, (state) => entitySelectors.selectAll(state)),
    selectListError: createSelector(selectListCallState, getError),
    selectListLoading: createSelector(selectListCallState, (c) => c === LoadingState.LOADING),
    selectHasMore: createSelector(selectIds, selectTotalItems, (ids, total) => ids.length < total),
    selectDetailError: createSelector(selectDetailCallState, getError),
    selectDetailLoading: createSelector(selectDetailCallState, (c) => c === LoadingState.LOADING),
  }),
});

export const { reducer } = eventsFeature;
