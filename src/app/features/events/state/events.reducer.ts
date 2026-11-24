import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { CallState, LoadingState, getError } from '@core/http/call-state';
import type { ApiError } from '@core/http/api-error';
import type { Group, MemberRef } from '@core/platform/platform-api.service';
import { EventDetail, EventSummary } from '../models/event.models';
import { EventsApiActions, EventsPageActions } from './events.actions';

export const eventsFeatureKey = 'events';

export const eventAdapter = createEntityAdapter<EventSummary>({
  sortComparer: (a, b) => a.startsAt.localeCompare(b.startsAt),
});
const entitySelectors = eventAdapter.getSelectors();

export interface State extends EntityState<EventSummary> {
  listCallState: CallState;
  selected: EventDetail | null;
  detailCallState: CallState;
  /** Which change is waiting for the API, for example `rsvp` or `claim:<itemId>`. */
  pending: string | null;
  saving: boolean;
  /** The last failed change, shown as a message. */
  error: ApiError | null;
  groups: Group[];
  members: MemberRef[];
}

export const initialState: State = eventAdapter.getInitialState({
  listCallState: LoadingState.INIT,
  selected: null,
  detailCallState: LoadingState.INIT,
  pending: null,
  saving: false,
  error: null,
  groups: [],
  members: [],
});

/** Keeps only the summary fields when an event goes into the list. */
function toSummary(event: EventDetail): EventSummary {
  const { description, attendees, bringItems, programme, sleeping, version, ...summary } = event;
  return summary;
}

const showEvent = (state: State, event: EventDetail): State =>
  eventAdapter.upsertOne(toSummary(event), {
    ...state,
    selected: state.selected === null || state.selected.id === event.id ? event : state.selected,
    detailCallState: LoadingState.LOADED,
    pending: null,
  });

export const eventsReducer = createReducer(
  initialState,
  on(EventsPageActions.loadEvents, (state): State => ({ ...state, listCallState: LoadingState.LOADING })),
  on(EventsApiActions.eventsLoaded, (state, { page }): State =>
    eventAdapter.setAll(page.items, { ...state, listCallState: LoadingState.LOADED })),
  on(EventsApiActions.eventsLoadFailed, (state, { error }): State => ({ ...state, listCallState: { errorMsg: error.message } })),

  on(EventsPageActions.openEvent, (state, { eventId }): State => ({
    ...state,
    selected: state.selected?.id === eventId ? state.selected : null,
    detailCallState: LoadingState.LOADING,
    error: null,
  })),
  on(EventsApiActions.eventLoaded, (state, { event }): State => showEvent({ ...state, selected: event }, event)),
  on(EventsApiActions.eventLoadFailed, (state, { error }): State => ({ ...state, detailCallState: { errorMsg: error.message } })),

  on(EventsPageActions.setRsvp, (state): State => ({ ...state, pending: 'rsvp', error: null })),
  on(EventsPageActions.claimItem, EventsPageActions.unclaimItem, EventsPageActions.removeBringItem,
    (state, { itemId }): State => ({ ...state, pending: `item:${itemId}`, error: null })),
  on(EventsPageActions.addBringItem, (state): State => ({ ...state, pending: 'add-item', error: null })),
  on(EventsApiActions.eventChanged, (state, { event }): State => showEvent(state, event)),
  on(EventsApiActions.changeFailed, (state, { error }): State => ({ ...state, pending: null, error })),

  on(EventsPageActions.createEvent, EventsPageActions.updateEvent, EventsPageActions.cancelEvent,
    (state): State => ({ ...state, saving: true, error: null })),
  on(EventsApiActions.eventSaved, (state, { event }): State => ({ ...showEvent({ ...state, selected: event }, event), saving: false })),
  on(EventsApiActions.saveFailed, (state, { error }): State => ({ ...state, saving: false, error })),
  on(EventsApiActions.eventCancelled, (state, { eventId }): State =>
    eventAdapter.removeOne(eventId, { ...state, saving: false, selected: null })),

  on(EventsApiActions.formOptionsLoaded, (state, { groups, members }): State => ({ ...state, groups, members })),
  on(EventsApiActions.formOptionsFailed, (state, { error }): State => ({ ...state, error })),
  on(EventsPageActions.dismissError, (state): State => ({ ...state, error: null })),
);

export const eventsFeature = createFeature({
  name: eventsFeatureKey,
  reducer: eventsReducer,
  extraSelectors: ({ selectEventsState, selectListCallState, selectDetailCallState }) => ({
    selectEventList: createSelector(selectEventsState, (state) => entitySelectors.selectAll(state)),
    selectListError: createSelector(selectListCallState, getError),
    selectListLoading: createSelector(selectListCallState, (c) => c === LoadingState.LOADING),
    selectDetailError: createSelector(selectDetailCallState, getError),
    selectDetailLoading: createSelector(selectDetailCallState, (c) => c === LoadingState.LOADING),
  }),
});

export const { reducer } = eventsFeature;
