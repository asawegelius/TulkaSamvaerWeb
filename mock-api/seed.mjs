// Sample data for the mock API. Names and events are sample content.
// Dates are relative to today so the mock always has upcoming events.

import { addDays, fromWallTime, toWallTime } from './time.mjs';

export const ME_ID = '00000000-0000-4000-8000-000000000001';
/** Where the sample family lives. */
export const HOME_ZONE = 'Europe/Copenhagen';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const member = (n, displayName, roles = ['MEMBER'], timeZone = HOME_ZONE) => ({
  id: id(n),
  displayName,
  initials: displayName.slice(0, 1).toUpperCase(),
  avatarMediaId: null,
  roles,
  timeZone,
});

/**
 * @param now        the current moment; sample dates are relative to it
 * @param extraEvents extra public events, to try paging (MOCK_EXTRA_EVENTS)
 */
export function createSeed(now = new Date(), { extraEvents = 0 } = {}) {
  const members = [
    member(1, 'Åsa', ['ADMIN', 'INNER_CIRCLE', 'MEMBER']),
    member(2, 'Jonas', ['INNER_CIRCLE', 'MEMBER']),
    member(3, 'Sofie', ['INNER_CIRCLE', 'MEMBER']),
    member(4, 'Kasper', ['INNER_CIRCLE', 'MEMBER']),
    member(5, 'Maja', ['INNER_CIRCLE', 'MEMBER']),
    member(6, 'Peter', ['INNER_CIRCLE', 'MEMBER']),
    member(7, 'Henrik', ['MEMBER'], 'America/New_York'),
    member(8, 'Line', ['INNER_CIRCLE', 'MEMBER']),
    member(9, 'Mormor', ['INNER_CIRCLE', 'MEMBER']),
    member(10, 'Morfar', ['INNER_CIRCLE', 'MEMBER']),
    member(11, 'Jens', ['INNER_CIRCLE', 'MEMBER']),
    member(12, 'Emil'),
    member(13, 'Nora'),
  ];
  const m = (n) => id(n);

  const groups = [
    { id: id(101), name: 'Family', ownerId: m(1), memberIds: [m(1), m(8), m(9), m(10), m(11)] },
    { id: id(102), name: 'Best friends', ownerId: m(1), memberIds: [m(1), m(2), m(3), m(4), m(5), m(6), m(7)] },
    { id: id(103), name: 'Cousins', ownerId: m(8), memberIds: [m(1), m(8), m(12), m(13)] },
  ];

  // Wall-clock times at home, `offset` days from today.
  const todayAtHome = toWallTime(now.toISOString(), HOME_ZONE).date;
  const day = (offset, hh = 0, mm = 0) => fromWallTime(addDays(todayAtHome, offset), `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, HOME_ZONE);

  // Next Friday at least 10 days out, for the board game weekend.
  const fri = (() => {
    let o = 10;
    while (new Date(`${addDays(todayAtHome, o)}T12:00:00Z`).getUTCDay() !== 5) o++;
    return o;
  })();

  const answer = (n, status, note = null) => ({ memberId: m(n), status, note, invited: true });

  const events = [
    {
      id: id(201),
      kind: 'GATHERING',
      title: 'Board game weekend',
      description: 'Bring your favourite games. We have beds for five, the rest are day guests.',
      startsAt: day(fri, 18),
      endsAt: day(fri + 2, 15),
      allDay: false,
      timeZone: HOME_ZONE,
      location: 'Our house',
      hostId: m(1),
      visibility: { scope: 'GROUPS', groupIds: [id(102)] },
      series: null,
      answers: [
        answer(1, 'GOING'),
        answer(2, 'GOING'),
        answer(3, 'GOING'),
        answer(4, 'GOING'),
        answer(5, 'GOING'),
        answer(6, 'GOING', 'Arriving Saturday morning'),
        answer(7, 'MAYBE'),
      ],
      bringItems: [
        { id: id(301), title: 'Friday dinner', details: 'Something for 8, ready by 19:00', slots: 1, createdBy: m(1), claims: [{ memberId: m(3), note: 'chili' }] },
        { id: id(302), title: 'Saturday breakfast', details: 'Bread, cheese, coffee', slots: 1, createdBy: m(1), claims: [{ memberId: m(1), note: null }] },
        { id: id(303), title: 'Saturday lunch', details: null, slots: 1, createdBy: m(1), claims: [] },
        { id: id(304), title: 'Saturday dinner', details: 'Cook together, shopping list attached', slots: 2, createdBy: m(1), claims: [{ memberId: m(2), note: null }, { memberId: m(5), note: null }] },
        { id: id(305), title: 'Snacks and drinks', details: null, slots: 1, createdBy: m(1), claims: [{ memberId: m(4), note: null }] },
        { id: id(306), title: 'Two new games each', details: null, slots: null, createdBy: m(1), claims: [] },
        { id: id(307), title: 'Sunday clean-up', details: null, slots: 3, createdBy: m(1), claims: [] },
        { id: id(308), title: 'Lift from the station', details: 'Fri around 17:30', slots: 1, createdBy: m(6), claims: [] },
      ],
      programme: [
        { startsAt: day(fri, 18), title: 'Arrive, dinner, a quick warm-up game' },
        { startsAt: day(fri + 1, 10), title: 'Long game, the big one on the dining table' },
        { startsAt: day(fri + 1, 15), title: 'Walk or a turn in the studio for anyone who likes' },
        { startsAt: day(fri + 2, 13), title: 'Clean-up and goodbyes' },
      ],
      sleeping: [
        { place: 'Guest apartment', guestIds: [m(3), m(4)], note: null },
        { place: 'Office', guestIds: [m(6)], note: 'sofa bed' },
        { place: 'Day guests', guestIds: [m(2), m(5)], note: null },
      ],
      version: 1,
    },
    {
      id: id(202),
      kind: 'BIRTHDAY',
      title: 'Mormor turns 80',
      description: 'Line collects for a joint gift.',
      startsAt: day(fri + 14, 13),
      endsAt: day(fri + 14, 18),
      allDay: false,
      timeZone: HOME_ZONE,
      location: 'Our house',
      hostId: m(8),
      visibility: { scope: 'GROUPS', groupIds: [id(101), id(102)] },
      series: { id: id(401), recurrence: { frequency: 'YEARLY', interval: 1, until: null } },
      answers: [answer(8, 'GOING'), answer(9, 'GOING'), answer(10, 'GOING'), answer(11, 'GOING'), answer(2, 'MAYBE')],
      bringItems: [
        { id: id(311), title: 'Cake', details: 'Mormor likes lagkage', slots: 1, createdBy: m(8), claims: [] },
        { id: id(312), title: 'Flowers', details: null, slots: 1, createdBy: m(8), claims: [{ memberId: m(11), note: null }] },
      ],
      programme: [],
      sleeping: [],
      version: 1,
    },
    {
      id: id(203),
      kind: 'GATHERING',
      title: 'Seed swap in the studio',
      description: 'Bring seeds in envelopes, labelled with name and year.',
      startsAt: day(fri + 30, 11),
      endsAt: day(fri + 30, 14),
      allDay: false,
      timeZone: HOME_ZONE,
      location: 'Pottery studio',
      hostId: m(9),
      visibility: { scope: 'ALL_MEMBERS', groupIds: [] },
      series: null,
      answers: [
        { memberId: m(9), status: 'GOING', note: null, invited: true },
        { memberId: m(7), status: 'GOING', note: null, invited: false },
        { memberId: m(12), status: 'GOING', note: null, invited: false },
        { memberId: m(13), status: 'CANT', note: null, invited: false },
      ],
      bringItems: [],
      programme: [],
      sleeping: [],
      version: 1,
    },
    {
      id: id(204),
      kind: 'OTHER',
      title: 'Plan the garden beds',
      description: 'Just a note to myself.',
      startsAt: day(3, 0),
      endsAt: day(4, 0),
      allDay: true,
      timeZone: HOME_ZONE,
      location: null,
      hostId: m(1),
      visibility: { scope: 'ONLY_ME', groupIds: [] },
      series: null,
      answers: [answer(1, 'GOING')],
      bringItems: [],
      programme: [],
      sleeping: [],
      version: 1,
    },
    {
      id: id(205),
      kind: 'GATHERING',
      title: 'Cousins pizza night',
      description: null,
      startsAt: day(6, 18),
      endsAt: day(6, 22),
      allDay: false,
      timeZone: HOME_ZONE,
      location: 'Line and Jens',
      hostId: m(8),
      visibility: { scope: 'GROUPS', groupIds: [id(103)] },
      series: null,
      answers: [answer(8, 'GOING'), answer(1, 'PENDING'), answer(12, 'GOING'), answer(13, 'PENDING')],
      bringItems: [{ id: id(321), title: 'Toppings', details: null, slots: null, createdBy: m(8), claims: [] }],
      programme: [],
      sleeping: [],
      version: 1,
    },
    {
      id: id(206),
      kind: 'OTHER',
      title: "Henrik's private planning",
      description: 'Not visible to Åsa: checks that the mock filters by visibility.',
      startsAt: day(8, 12),
      endsAt: day(8, 13),
      allDay: false,
      timeZone: HOME_ZONE,
      location: null,
      hostId: m(7),
      visibility: { scope: 'ONLY_ME', groupIds: [] },
      series: null,
      answers: [{ memberId: m(7), status: 'GOING', note: null, invited: true }],
      bringItems: [],
      programme: [],
      sleeping: [],
      version: 1,
    },
  ];

  // Juleaften as a yearly series: this year and next.
  const [y, mo, d] = todayAtHome.split('-').map(Number);
  const year = mo === 12 && d > 24 ? y + 1 : y;
  [0, 1].forEach((k) => {
    const start = fromWallTime(`${year + k}-12-24`, '15:00', HOME_ZONE);
    const end = fromWallTime(`${year + k}-12-24`, '23:00', HOME_ZONE);
    events.push({
      id: id(210 + k),
      kind: 'HOLIDAY',
      title: 'Juleaften at home',
      description: null,
      startsAt: start,
      endsAt: end,
      allDay: false,
      timeZone: HOME_ZONE,
      location: 'Our house',
      hostId: m(1),
      visibility: { scope: 'GROUPS', groupIds: [id(101)] },
      series: { id: id(402), recurrence: { frequency: 'YEARLY', interval: 1, until: null } },
      answers: k === 0
        ? [answer(1, 'GOING'), answer(8, 'GOING'), answer(9, 'GOING'), answer(10, 'GOING'), answer(11, 'MAYBE')]
        : [answer(1, 'GOING'), answer(8, 'PENDING'), answer(9, 'PENDING'), answer(10, 'PENDING'), answer(11, 'PENDING')],
      bringItems: [
        { id: id(330 + k * 2), title: 'Dessert', details: 'Risalamande for 11', slots: 1, createdBy: m(1), claims: [] },
        { id: id(331 + k * 2), title: 'Christmas tree', details: null, slots: 1, createdBy: m(1), claims: k === 0 ? [{ memberId: m(11), note: null }] : [] },
      ],
      programme: [],
      sleeping: [],
      version: 1,
    });
  });

  // Extra open events, one every other day from next week, to try paging.
  for (let k = 0; k < extraEvents; k++) {
    events.push({
      id: id(1000 + k),
      kind: 'GATHERING',
      title: `Morning walk ${k + 1}`,
      description: null,
      startsAt: day(7 + 2 * k, 9),
      endsAt: day(7 + 2 * k, 10),
      allDay: false,
      timeZone: HOME_ZONE,
      location: 'The lake',
      hostId: m(2),
      visibility: { scope: 'ALL_MEMBERS', groupIds: [] },
      series: null,
      answers: [{ memberId: m(2), status: 'GOING', note: null, invited: true }],
      bringItems: [],
      programme: [],
      sleeping: [],
      version: 1,
    });
  }

  return { members, groups, events };
}
