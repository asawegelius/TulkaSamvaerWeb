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
import { ME_ID } from './seed.mjs';

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
    endsAt: ev.endsAt, allDay: ev.allDay, location: ev.location, visibility: ev.visibility,
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
  const start = new Date();
  start.setDate(start.getDate() + 20);
  start.setHours(14, 0, 0, 0);
  const end = new Date(start.getTime() + 3 * 3600e3);
  const res = api.handle('POST', '/api/v1/events', {
    kind: 'BIRTHDAY', title: 'Line turns 40', startsAt: start.toISOString(), endsAt: end.toISOString(),
    allDay: false, visibility: { scope: 'GROUPS', groupIds: [FAMILY] },
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
});

test('invalid input answers a problem with field errors', () => {
  const res = newApi().handle('POST', '/api/v1/events', {
    kind: 'GATHERING', title: '', startsAt: '2027-01-02T10:00:00Z', endsAt: '2027-01-01T10:00:00Z',
    allDay: false, visibility: { scope: 'GROUPS', groupIds: [] },
  });
  assert.equal(res.status, 400);
  assertSchema('Problem', res.body);
  const fields = res.body.fieldErrors.map((f) => f.field).sort();
  assert.deepEqual(fields, ['endsAt', 'title', 'visibility.groupIds']);
});

test('signed in as someone else changes allowedActions', () => {
  const ev = newApi().handle('GET', `/api/v1/events/${BOARD_GAMES}`, undefined, SOFIE).body;
  assert.ok(!ev.allowedActions.includes('edit'));
  assert.ok(ev.allowedActions.includes('rsvp'));
  assert.notEqual(ME_ID, SOFIE);
});
