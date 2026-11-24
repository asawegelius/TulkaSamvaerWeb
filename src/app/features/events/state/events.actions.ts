import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { ApiError } from '@core/http/api-error';
import type { Group, MemberRef } from '@core/platform/platform-api.service';
import {
  BringItemInput, EventDetail, EventInput, EventPage, EventUpdate, RsvpAnswer,
} from '../models/event.models';

/** What the member did on an events page. */
export const EventsPageActions = createActionGroup({
  source: 'Events Page',
  events: {
    'Load Events': emptyProps(),
    'Open Event': props<{ eventId: string }>(),
    'Load Form Options': emptyProps(),
    'Set Rsvp': props<{ eventId: string; status: RsvpAnswer }>(),
    'Claim Item': props<{ eventId: string; itemId: string }>(),
    'Unclaim Item': props<{ eventId: string; itemId: string }>(),
    'Add Bring Item': props<{ eventId: string; item: BringItemInput }>(),
    'Remove Bring Item': props<{ eventId: string; itemId: string }>(),
    'Create Event': props<{ input: EventInput }>(),
    'Update Event': props<{ eventId: string; update: EventUpdate }>(),
    'Cancel Event': props<{ eventId: string }>(),
    'Dismiss Error': emptyProps(),
  },
});

/** What the API answered. */
export const EventsApiActions = createActionGroup({
  source: 'Events API',
  events: {
    'Events Loaded': props<{ page: EventPage }>(),
    'Events Load Failed': props<{ error: ApiError }>(),
    'Event Loaded': props<{ event: EventDetail }>(),
    'Event Load Failed': props<{ error: ApiError }>(),
    'Event Changed': props<{ event: EventDetail }>(),
    'Change Failed': props<{ eventId: string; error: ApiError }>(),
    'Event Saved': props<{ event: EventDetail }>(),
    'Save Failed': props<{ error: ApiError }>(),
    'Event Cancelled': props<{ eventId: string }>(),
    'Form Options Loaded': props<{ groups: Group[]; members: MemberRef[] }>(),
    'Form Options Failed': props<{ error: ApiError }>(),
  },
});
