// Checks that the mock answers in the shape api/openapi.yaml describes,
// so the Angular app is built against the real contract.
// Run: npm run test:mock

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { createMockApi } from './server.mjs';
import { ME_ID, createSeed } from './seed.mjs';
import { addDays, fromWallTime, toWallTime } from './time.mjs';

const spec = parse(readFileSync(new URL('../api/openapi.yaml', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema({ $id: 'openapi', components: spec.components });

function assertSchema(name, value) {
  const validate = ajv.getSchema(`openapi#/components/schemas/${name}`);
  const ok = validate(value);
  assert.ok(ok, `${name}: ${ajv.errorsText(validate.errors)}`);
}

const HENRIK = '00000000-0000-4000-8000-000000000007';
const SOFIE = '00000000-0000-4000-8000-000000000003';
const BOARD_GAMES = '00000000-0000-4000-8000-000000000201';
const LUNCH = '00000000-0000-4000-8000-000000000303';
const FAMILY = '00000000-0000-4000-8000-000000000101';
const CPH = 'Europe/Copenhagen';

const newApi = () => createMockApi();

test('me and groups match the contract', () => {
  const api = newApi();
  assertSchema('Me', api.handle('GET', '/api/v1/me').body);
  const groups = api.handle('GET', '/api/v1/me/groups').body;
  assert.ok(groups.length > 0);
  groups.forEach((g) => assertSchema('Group', g));
  api.handle('GET', '/api/v1/members').body.forEach((m) => assertSchema('MemberRef', m));
});

test('event list is a page of summaries, soonest first', () => {
  const res = newApi().handle('GET', '/api/v1/events');
  assert.equal(res.status, 200);
  assertSchema('EventPage', res.body);
  const starts = res.body.items.map((e) => e.startsAt);
  assert.deepEqual(starts, [...starts].sort());
});

test('every visible event matches the Event schema', () => {
  const api = newApi();
  for (const s of api.handle('GET', '/api/v1/events?size=100').body.items) {
    assertSchema('Event', api.handle('GET', `/api/v1/events/${s.id}`).body);
  }
});

test('private events stay hidden and answer 404', () => {
  const api = newApi();
  const titles = api.handle('GET', '/api/v1/events?size=100').body.items.map((e) => e.title);
  assert.ok(!titles.includes("Henrik's private planning"));
  const res = api.handle('GET', '/api/v1/events/00000000-0000-4000-8000-000000000206');
  assert.equal(res.status, 404);
  assertSchema('Problem', res.body);
});

test('RSVP changes my answer and the counts', () => {
  const api = newApi();
  const before = api.handle('GET', `/api/v1/events/${BOARD_GAMES}`, undefined, HENRIK).body;
  assert.equal(before.myRsvp, 'MAYBE');
  const after = api.handle('PUT', `/api/v1/events/${BOARD_GAMES}/rsvp`, { status: 'GOING' }, HENRIK).body;
  assertSchema('Event', after);
  assert.equal(after.myRsvp, 'GOING');
  assert.equal(after.rsvpSummary.going, before.rsvpSummary.going + 1);
  assert.equal(after.rsvpSummary.maybe, before.rsvpSummary.maybe - 1);
});

test('claiming an item takes the last slot, and a second claim gets 409', () => {
  const api = newApi();
  const claimed = api.handle('PUT', `/api/v1/events/${BOARD_GAMES}/bring-items/${LUNCH}/claim`, { note: 'soup' }).body;
  const lunch = claimed.bringItems.find((i) => i.id === LUNCH);
  assert.equal(lunch.claimedBy[0].note, 'soup');
  assert.deepEqual(lunch.allowedActions.includes('unclaim'), true);

  const res = api.handle('PUT', `/api/v1/events/${BOARD_GAMES}/bring-items/${LUNCH}/claim`, undefined, SOFIE);
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'events.item-full');

  const back = api.handle('DELETE', `/api/v1/events/${BOARD_GAMES}/bring-items/${LUNCH}/claim`).body;
  assert.equal(back.bringItems.find((i) => i.id === LUNCH).claimedBy.length, 0);
});

test('only the host may edit, and a stale version gets 409', () => {
  const api = newApi();
  const ev = api.handle('GET', `/api/v1/events/${BOARD_GAMES}`).body;
  const update = {
    kind: ev.kind, title: 'Board game weekend 2', description: ev.description, startsAt: ev.startsAt,
    endsAt: ev.endsAt, allDay: ev.allDay, timeZone: ev.timeZone, location: ev.location, visibility: ev.visibility,
    programme: ev.programme, sleeping: [], version: ev.version,
  };
  assert.equal(api.handle('PUT', `/api/v1/events/${BOARD_GAMES}`, update, SOFIE).status, 403);
  const ok = api.handle('PUT', `/api/v1/events/${BOARD_GAMES}`, update);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.title, 'Board game weekend 2');
  assert.equal(api.handle('PUT', `/api/v1/events/${BOARD_GAMES}`, update).status, 409);
});

test('creating a yearly birthday makes upcoming occurrences and invites the group', () => {
  const api = newApi();
  const date = addDays(toWallTime(new Date().toISOString(), CPH).date, 20);
  const res = api.handle('POST', '/api/v1/events', {
    kind: 'BIRTHDAY', title: 'Line turns 40', startsAt: fromWallTime(date, '14:00', CPH), endsAt: fromWallTime(date, '17:00', CPH),
    allDay: false, timeZone: CPH, visibility: { scope: 'GROUPS', groupIds: [FAMILY] },
    recurrence: { frequency: 'YEARLY', interval: 1 },
    bringItems: [{ title: 'Cake' }],
  });
  assert.equal(res.status, 201);
  assertSchema('Event', res.body);
  assert.equal(res.body.myRsvp, 'GOING');
  assert.equal(res.body.series.recurrence.frequency, 'YEARLY');
  assert.ok(res.body.attendees.length >= 5);
  const all = api.handle('GET', '/api/v1/events?size=100').body.items.filter((e) => e.title === 'Line turns 40');
  assert.ok(all.length >= 2, 'at least two yearly occurrences');
  for (const e of all) assert.equal(toWallTime(e.startsAt, CPH).time, '14:00', 'every occurrence at 14:00 at home');
});

test('invalid input answers a problem with field errors', () => {
  const res = newApi().handle('POST', '/api/v1/events', {
    kind: 'GATHERING', title: '', startsAt: '2027-01-02T10:00:00Z', endsAt: '2027-01-01T10:00:00Z',
    allDay: false, timeZone: 'Mars/Olympus', visibility: { scope: 'GROUPS', groupIds: [] },
  });
  assert.equal(res.status, 400);
  assertSchema('Problem', res.body);
  const fields = res.body.fieldErrors.map((f) => f.field).sort();
  assert.deepEqual(fields, ['endsAt', 'timeZone', 'title', 'visibility.groupIds']);
});

test('signed in as someone else changes allowedActions', () => {
  const ev = newApi().handle('GET', `/api/v1/events/${BOARD_GAMES}`, undefined, SOFIE).body;
  assert.ok(!ev.allowedActions.includes('edit'));
  assert.ok(ev.allowedActions.includes('rsvp'));
  assert.notEqual(ME_ID, SOFIE);
});

test('pages through more than 50 events without gaps or repeats', () => {
  const api = createMockApi({ seed: createSeed(new Date(), { extraEvents: 60 }) });
  const first = api.handle('GET', '/api/v1/events?page=0&size=20').body;
  assert.ok(first.totalItems > 60);
  const seen = [];
  for (let page = 0; page * 20 < first.totalItems; page++) {
    const res = api.handle('GET', `/api/v1/events?page=${page}&size=20`).body;
    assertSchema('EventPage', res);
    assert.equal(res.page, page);
    seen.push(...res.items.map((e) => e.id));
  }
  assert.equal(seen.length, first.totalItems);
  assert.equal(new Set(seen).size, seen.length);
  assert.equal(api.handle('GET', '/api/v1/events?page=99&size=20').body.items.length, 0);
});

test('a repeating event keeps its wall-clock time across daylight saving', () => {
  const api = newApi();
  const res = api.handle('POST', '/api/v1/events', {
    kind: 'BIRTHDAY', title: 'Spring birthday', allDay: false, timeZone: CPH,
    startsAt: fromWallTime('2027-01-09', '13:00', CPH), endsAt: fromWallTime('2027-01-09', '16:00', CPH),
    visibility: { scope: 'ONLY_ME', groupIds: [] }, recurrence: { frequency: 'MONTHLY', interval: 6 },
  });
  const all = api.handle('GET', '/api/v1/events?from=2027-01-01T00:00:00Z&to=2028-01-01T00:00:00Z').body.items
    .filter((e) => e.title === 'Spring birthday');
  assert.deepEqual(all.map((e) => toWallTime(e.startsAt, CPH)), [
    { date: '2027-01-09', time: '13:00' },
    { date: '2027-07-09', time: '13:00' },
  ]);
  assert.notEqual(all[0].startsAt.slice(11, 16), all[1].startsAt.slice(11, 16), 'UTC time differs, wall time does not');
  assert.equal(res.body.timeZone, CPH);
});

test('all-day events start and end at midnight in their zone', () => {
  const api = newApi();
  const body = {
    kind: 'OTHER', title: 'Garden day', allDay: true, timeZone: CPH, visibility: { scope: 'ONLY_ME', groupIds: [] },
    startsAt: fromWallTime('2027-05-01', '00:00', CPH), endsAt: fromWallTime('2027-05-02', '00:00', CPH),
  };
  assert.equal(api.handle('POST', '/api/v1/events', body).status, 201);
  const bad = api.handle('POST', '/api/v1/events', { ...body, endsAt: fromWallTime('2027-05-01', '23:59', CPH) });
  assert.equal(bad.status, 400);
});

test('me includes the member time zone', () => {
  assert.equal(newApi().handle('GET', '/api/v1/me').body.timeZone, CPH);
});
