import { BringItem, EventDetail, EventSummary } from '../models/event.models';

export const ASA = { id: 'm-1', displayName: 'Åsa', initials: 'Å', avatarMediaId: null };
export const SOFIE = { id: 'm-3', displayName: 'Sofie', initials: 'S', avatarMediaId: null };

export function bringItemFixture(overrides: Partial<BringItem> = {}): BringItem {
  return {
    id: 'i-1',
    title: 'Saturday lunch',
    details: null,
    slots: 1,
    claimedBy: [],
    allowedActions: ['claim'],
    ...overrides,
  };
}

export function eventFixture(overrides: Partial<EventDetail> = {}): EventDetail {
  return {
    id: 'e-1',
    kind: 'GATHERING',
    title: 'Board game weekend',
    startsAt: '2027-01-15T17:00:00Z',
    endsAt: '2027-01-17T14:00:00Z',
    allDay: false,
    timeZone: 'Europe/Copenhagen',
    location: 'Our house',
    host: ASA,
    visibility: { scope: 'GROUPS', groupIds: ['g-2'] },
    audienceLabel: 'Best friends',
    series: null,
    myRsvp: 'PENDING',
    rsvpSummary: { going: 1, maybe: 0, cant: 0, pending: 1 },
    bringList: { total: 1, taken: 0 },
    allowedActions: ['rsvp', 'add-bring-item'],
    description: 'Bring your favourite games.',
    attendees: [
      { member: ASA, status: 'GOING', note: null },
      { member: SOFIE, status: 'PENDING', note: null },
    ],
    bringItems: [bringItemFixture()],
    programme: [{ startsAt: '2027-01-15T17:00:00Z', title: 'Arrive and dinner' }],
    sleeping: [{ place: 'Guest apartment', guests: [SOFIE], note: null }],
    version: 1,
    ...overrides,
  };
}

export function summaryFixture(overrides: Partial<EventSummary> = {}): EventSummary {
  const { description, attendees, bringItems, programme, sleeping, version, ...summary } = eventFixture();
  return { ...summary, ...overrides };
}
