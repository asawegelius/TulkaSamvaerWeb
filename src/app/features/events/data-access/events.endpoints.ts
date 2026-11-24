/** Paths in api/openapi.yaml for the events section. */
export const EVENTS_ENDPOINTS = {
  events: 'api/v1/events',
  event: (eventId: string) => `api/v1/events/${encodeURIComponent(eventId)}`,
  rsvp: (eventId: string) => `api/v1/events/${encodeURIComponent(eventId)}/rsvp`,
  invites: (eventId: string) => `api/v1/events/${encodeURIComponent(eventId)}/invites`,
  bringItems: (eventId: string) => `api/v1/events/${encodeURIComponent(eventId)}/bring-items`,
  bringItem: (eventId: string, itemId: string) =>
    `api/v1/events/${encodeURIComponent(eventId)}/bring-items/${encodeURIComponent(itemId)}`,
  claim: (eventId: string, itemId: string) =>
    `api/v1/events/${encodeURIComponent(eventId)}/bring-items/${encodeURIComponent(itemId)}/claim`,
} as const;
