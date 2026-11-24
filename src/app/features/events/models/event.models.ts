import type { ApiSchemas } from '@core/api';

// Feature types are the contract's types, so a contract change breaks the build.
export type EventSummary = ApiSchemas['EventSummary'];
export type EventDetail = ApiSchemas['Event'];
export type EventPage = ApiSchemas['EventPage'];
export type EventInput = ApiSchemas['EventInput'];
export type EventUpdate = ApiSchemas['EventUpdate'];
export type EventFields = ApiSchemas['EventFields'];
export type EventKind = ApiSchemas['EventKind'];
export type EventAction = ApiSchemas['EventAction'];
export type RsvpStatus = ApiSchemas['RsvpStatus'];
export type RsvpAnswer = ApiSchemas['RsvpInput']['status'];
export type BringItem = ApiSchemas['BringItem'];
export type BringItemInput = ApiSchemas['BringItemInput'];
export type Attendee = ApiSchemas['Attendee'];
export type Recurrence = ApiSchemas['Recurrence'];
export type InviteInput = ApiSchemas['InviteInput'];

export const RSVP_LABELS: Record<RsvpAnswer, string> = {
  GOING: 'Going',
  MAYBE: 'Maybe',
  CANT: "Can't",
};

export const KIND_LABELS: Record<EventKind, string> = {
  GATHERING: 'Get-together',
  BIRTHDAY: 'Birthday',
  HOLIDAY: 'Holiday',
  TRIP: 'Trip',
  OTHER: 'Event',
};

export const RECURRENCE_LABELS: Record<Recurrence['frequency'], string> = {
  WEEKLY: 'Every week',
  MONTHLY: 'Every month',
  YEARLY: 'Every year',
};
