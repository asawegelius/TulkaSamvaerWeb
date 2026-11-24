// Mock of api/openapi.yaml for frontend work before the Spring Boot backend exists.
// It plays the backend's role, so the rules here (visibility, allowedActions, claims)
// are a stand-in for the real ones and must never move into the Angular app.
//
// Run: npm run mock:api          (port 3000, signed in as Åsa)
//      MOCK_USER=<member uuid> npm run mock:api   to act as someone else
//      MOCK_DELAY_MS=400 npm run mock:api        to see loading states

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createSeed, ME_ID } from './seed.mjs';

class ApiProblem extends Error {
  constructor(status, code, title, detail, fieldErrors) {
    super(title);
    this.status = status;
    this.code = code;
    this.title = title;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

const notFound = () => new ApiProblem(404, 'common.not-found', 'Not found');
const forbidden = () => new ApiProblem(403, 'common.forbidden', 'Not allowed');
const invalid = (fieldErrors) =>
  new ApiProblem(400, 'common.validation', 'Invalid input', 'Some fields need attention.', fieldErrors);

export function createMockApi({ seed = createSeed(), meId = ME_ID } = {}) {
  const db = structuredClone(seed);

  const memberById = (mid) => db.members.find((x) => x.id === mid);
  const memberRef = (mid) => {
    const mm = memberById(mid);
    return mm
      ? { id: mm.id, displayName: mm.displayName, initials: mm.initials, avatarMediaId: mm.avatarMediaId }
      : { id: mid, displayName: 'Former member', initials: '?', avatarMediaId: null };
  };
  const groupsOf = (mid) => db.groups.filter((g) => g.memberIds.includes(mid));
  const inGroups = (mid, groupIds) => groupsOf(mid).some((g) => groupIds.includes(g.id));

  const canSee = (ev, viewer) => {
    if (ev.hostId === viewer) return true;
    if (ev.visibility.scope === 'ONLY_ME') return false;
    if (ev.visibility.scope === 'ALL_MEMBERS') return true;
    return ev.answers.some((a) => a.memberId === viewer) || inGroups(viewer, ev.visibility.groupIds);
  };

  const findVisible = (eventId, viewer) => {
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev || !canSee(ev, viewer)) throw notFound();
    return ev;
  };

  const audienceLabel = (ev) => {
    if (ev.visibility.scope === 'ONLY_ME') return 'Only me';
    if (ev.visibility.scope === 'ALL_MEMBERS') return 'All members';
    return ev.visibility.groupIds.map((gid) => db.groups.find((g) => g.id === gid)?.name).filter(Boolean).join(', ');
  };

  const myStatus = (ev, viewer) => ev.answers.find((a) => a.memberId === viewer)?.status ?? 'PENDING';

  const eventActions = (ev, viewer) => {
    const isHost = ev.hostId === viewer;
    const actions = [];
    if (isHost) actions.push('edit', 'cancel', 'invite');
    if (ev.visibility.scope !== 'ONLY_ME') actions.push('rsvp');
    actions.push('add-bring-item');
    return actions;
  };

  const itemActions = (ev, item, viewer) => {
    const mine = item.claims.some((c) => c.memberId === viewer);
    const full = item.slots !== null && item.claims.length >= item.slots;
    const actions = [];
    if (mine) actions.push('unclaim');
    else if (!full) actions.push('claim');
    if (ev.hostId === viewer || item.createdBy === viewer) actions.push('remove');
    return actions;
  };

  const toSummary = (ev, viewer) => {
    const count = (s) => ev.answers.filter((a) => a.status === s).length;
    const taken = ev.bringItems.filter((i) => i.claims.length > 0).length;
    return {
      id: ev.id,
      kind: ev.kind,
      title: ev.title,
      startsAt: ev.startsAt,
      endsAt: ev.endsAt,
      allDay: ev.allDay,
      location: ev.location,
      host: memberRef(ev.hostId),
      visibility: ev.visibility,
      audienceLabel: audienceLabel(ev),
      series: ev.series,
      myRsvp: myStatus(ev, viewer),
      rsvpSummary: { going: count('GOING'), maybe: count('MAYBE'), cant: count('CANT'), pending: count('PENDING') },
      bringList: { total: ev.bringItems.length, taken },
      allowedActions: eventActions(ev, viewer),
    };
  };

  const statusOrder = { GOING: 0, MAYBE: 1, PENDING: 2, CANT: 3 };
  const toEvent = (ev, viewer) => ({
    ...toSummary(ev, viewer),
    description: ev.description,
    attendees: [...ev.answers]
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
      .map((a) => ({ member: memberRef(a.memberId), status: a.status, note: a.note })),
    bringItems: ev.bringItems.map((i) => ({
      id: i.id,
      title: i.title,
      details: i.details,
      slots: i.slots,
      claimedBy: i.claims.map((c) => ({ member: memberRef(c.memberId), note: c.note })),
      allowedActions: itemActions(ev, i, viewer),
    })),
    programme: [...ev.programme].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    sleeping: ev.sleeping.map((s) => ({ place: s.place, guests: s.guestIds.map(memberRef), note: s.note })),
    version: ev.version,
  });

  const validateFields = (body) => {
    const errors = [];
    const str = (v) => typeof v === 'string' && v.trim().length > 0;
    if (!str(body?.title)) errors.push({ field: 'title', message: 'Give the event a name.' });
    if (!['GATHERING', 'BIRTHDAY', 'HOLIDAY', 'TRIP', 'OTHER'].includes(body?.kind)) errors.push({ field: 'kind', message: 'Unknown kind.' });
    const s = Date.parse(body?.startsAt);
    const e = Date.parse(body?.endsAt);
    if (Number.isNaN(s)) errors.push({ field: 'startsAt', message: 'Pick a start.' });
    if (Number.isNaN(e)) errors.push({ field: 'endsAt', message: 'Pick an end.' });
    if (!Number.isNaN(s) && !Number.isNaN(e) && e <= s) errors.push({ field: 'endsAt', message: 'The end must be after the start.' });
    const v = body?.visibility;
    if (!v || !['ONLY_ME', 'GROUPS', 'ALL_MEMBERS'].includes(v.scope)) errors.push({ field: 'visibility', message: 'Choose who can see it.' });
    else if (v.scope === 'GROUPS' && !(v.groupIds?.length > 0)) errors.push({ field: 'visibility.groupIds', message: 'Pick at least one group.' });
    if (errors.length) throw invalid(errors);
  };

  const normalisedFields = (body) => ({
    kind: body.kind,
    title: body.title.trim(),
    description: body.description ?? null,
    startsAt: new Date(body.startsAt).toISOString(),
    endsAt: new Date(body.endsAt).toISOString(),
    allDay: Boolean(body.allDay),
    location: body.location ?? null,
    visibility: { scope: body.visibility.scope, groupIds: body.visibility.scope === 'GROUPS' ? body.visibility.groupIds : [] },
    programme: (body.programme ?? []).map((p) => ({ startsAt: new Date(p.startsAt).toISOString(), title: p.title })),
    sleeping: (body.sleeping ?? []).map((s) => ({ place: s.place, guestIds: s.guestIds ?? [], note: s.note ?? null })),
  });

  const addInvites = (ev, invite) => {
    const ids = new Set(invite?.memberIds ?? []);
    for (const gid of invite?.groupIds ?? []) db.groups.find((g) => g.id === gid)?.memberIds.forEach((x) => ids.add(x));
    if (ev.visibility.scope === 'GROUPS') {
      for (const gid of ev.visibility.groupIds) db.groups.find((g) => g.id === gid)?.memberIds.forEach((x) => ids.add(x));
    }
    for (const mid of ids) {
      const existing = ev.answers.find((a) => a.memberId === mid);
      if (existing) existing.invited = true;
      else if (memberById(mid)) ev.answers.push({ memberId: mid, status: 'PENDING', note: null, invited: true });
    }
  };

  const occurrenceStarts = (start, recurrence) => {
    const out = [];
    const until = recurrence.until ? Date.parse(`${recurrence.until}T23:59:59Z`) : Infinity;
    const horizon = Date.now() + 2 * 366 * 864e5;
    for (let k = 0; out.length < 24; k++) {
      const d = new Date(start);
      const n = k * (recurrence.interval || 1);
      if (recurrence.frequency === 'WEEKLY') d.setDate(d.getDate() + 7 * n);
      if (recurrence.frequency === 'MONTHLY') d.setMonth(d.getMonth() + n);
      if (recurrence.frequency === 'YEARLY') d.setFullYear(d.getFullYear() + n);
      if (d.getTime() > until || d.getTime() > horizon) break;
      out.push(d);
    }
    return out;
  };

  const handlers = [
    ['GET', /^\/api\/v1\/me$/, ({ viewer }) => {
      const mm = memberById(viewer);
      return [200, { ...memberRef(viewer), roles: mm.roles }];
    }],
    ['GET', /^\/api\/v1\/me\/groups$/, ({ viewer }) => [200,
      groupsOf(viewer).map((g) => ({ id: g.id, name: g.name, memberCount: g.memberIds.length, mine: g.ownerId === viewer })),
    ]],
    ['GET', /^\/api\/v1\/members$/, ({ query }) => {
      const q = (query.get('q') ?? '').toLowerCase();
      return [200, db.members
        .filter((x) => x.displayName.toLowerCase().includes(q))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((x) => memberRef(x.id))];
    }],
    ['GET', /^\/api\/v1\/events$/, ({ viewer, query }) => {
      const page = Math.max(0, Number(query.get('page') ?? 0));
      const size = Math.min(100, Math.max(1, Number(query.get('size') ?? 20)));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const from = query.get('from') ? Date.parse(query.get('from')) : today.getTime();
      const to = query.get('to') ? Date.parse(query.get('to')) + 864e5 : Infinity;
      const visible = db.events
        .filter((e) => canSee(e, viewer))
        .filter((e) => Date.parse(e.endsAt) >= from && Date.parse(e.startsAt) < to)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      return [200, {
        items: visible.slice(page * size, page * size + size).map((e) => toSummary(e, viewer)),
        page,
        size,
        totalItems: visible.length,
      }];
    }],
    ['POST', /^\/api\/v1\/events$/, ({ viewer, body }) => {
      validateFields(body);
      const fields = normalisedFields(body);
      const series = body.recurrence ? { id: randomUUID(), recurrence: { interval: 1, until: null, ...body.recurrence } } : null;
      const starts = series ? occurrenceStarts(new Date(fields.startsAt), series.recurrence) : [new Date(fields.startsAt)];
      const duration = Date.parse(fields.endsAt) - Date.parse(fields.startsAt);
      const created = starts.map((start) => {
        const shift = start.getTime() - Date.parse(fields.startsAt);
        const ev = {
          id: randomUUID(),
          ...fields,
          startsAt: start.toISOString(),
          endsAt: new Date(start.getTime() + duration).toISOString(),
          programme: fields.programme.map((p) => ({ ...p, startsAt: new Date(Date.parse(p.startsAt) + shift).toISOString() })),
          hostId: viewer,
          series,
          answers: [{ memberId: viewer, status: 'GOING', note: null, invited: true }],
          bringItems: (body.bringItems ?? []).filter((i) => i?.title?.trim()).map((i) => ({
            id: randomUUID(), title: i.title.trim(), details: i.details ?? null, slots: i.slots === undefined ? 1 : i.slots, createdBy: viewer, claims: [],
          })),
          version: 1,
        };
        addInvites(ev, body.invite);
        return ev;
      });
      db.events.push(...created);
      return [201, toEvent(created[0], viewer), { Location: `/api/v1/events/${created[0].id}` }];
    }],
    ['GET', /^\/api\/v1\/events\/([^/]+)$/, ({ viewer, params }) => [200, toEvent(findVisible(params[0], viewer), viewer)]],
    ['PUT', /^\/api\/v1\/events\/([^/]+)$/, ({ viewer, params, body }) => {
      const ev = findVisible(params[0], viewer);
      if (ev.hostId !== viewer) throw forbidden();
      validateFields(body);
      if (body.version !== ev.version) {
        throw new ApiProblem(409, 'common.stale-version', 'Changed by someone else', 'Reload the event and try again.');
      }
      Object.assign(ev, normalisedFields(body), { version: ev.version + 1 });
      addInvites(ev, undefined);
      return [200, toEvent(ev, viewer)];
    }],
    ['DELETE', /^\/api\/v1\/events\/([^/]+)$/, ({ viewer, params }) => {
      const ev = findVisible(params[0], viewer);
      if (ev.hostId !== viewer) throw forbidden();
      db.events = db.events.filter((e) => e !== ev);
      return [204];
    }],
    ['PUT', /^\/api\/v1\/events\/([^/]+)\/rsvp$/, ({ viewer, params, body }) => {
      const ev = findVisible(params[0], viewer);
      if (!eventActions(ev, viewer).includes('rsvp')) throw forbidden();
      if (!['GOING', 'MAYBE', 'CANT'].includes(body?.status)) throw invalid([{ field: 'status', message: 'Choose Going, Maybe or Can\'t.' }]);
      const existing = ev.answers.find((a) => a.memberId === viewer);
      if (existing) Object.assign(existing, { status: body.status, note: body.note ?? null });
      else ev.answers.push({ memberId: viewer, status: body.status, note: body.note ?? null, invited: false });
      return [200, toEvent(ev, viewer)];
    }],
    ['POST', /^\/api\/v1\/events\/([^/]+)\/invites$/, ({ viewer, params, body }) => {
      const ev = findVisible(params[0], viewer);
      if (ev.hostId !== viewer) throw forbidden();
      addInvites(ev, body);
      return [200, toEvent(ev, viewer)];
    }],
    ['POST', /^\/api\/v1\/events\/([^/]+)\/bring-items$/, ({ viewer, params, body }) => {
      const ev = findVisible(params[0], viewer);
      if (!body?.title?.trim()) throw invalid([{ field: 'title', message: 'What should someone bring?' }]);
      ev.bringItems.push({
        id: randomUUID(), title: body.title.trim(), details: body.details ?? null,
        slots: body.slots === undefined ? 1 : body.slots, createdBy: viewer, claims: [],
      });
      return [201, toEvent(ev, viewer)];
    }],
    ['DELETE', /^\/api\/v1\/events\/([^/]+)\/bring-items\/([^/]+)$/, ({ viewer, params }) => {
      const ev = findVisible(params[0], viewer);
      const item = ev.bringItems.find((i) => i.id === params[1]);
      if (!item) throw notFound();
      if (!itemActions(ev, item, viewer).includes('remove')) throw forbidden();
      ev.bringItems = ev.bringItems.filter((i) => i !== item);
      return [200, toEvent(ev, viewer)];
    }],
    ['PUT', /^\/api\/v1\/events\/([^/]+)\/bring-items\/([^/]+)\/claim$/, ({ viewer, params, body }) => {
      const ev = findVisible(params[0], viewer);
      const item = ev.bringItems.find((i) => i.id === params[1]);
      if (!item) throw notFound();
      const mine = item.claims.find((c) => c.memberId === viewer);
      if (mine) mine.note = body?.note ?? mine.note;
      else if (item.slots !== null && item.claims.length >= item.slots) {
        throw new ApiProblem(409, 'events.item-full', 'Already taken', 'Someone was quicker.');
      } else item.claims.push({ memberId: viewer, note: body?.note ?? null });
      return [200, toEvent(ev, viewer)];
    }],
    ['DELETE', /^\/api\/v1\/events\/([^/]+)\/bring-items\/([^/]+)\/claim$/, ({ viewer, params }) => {
      const ev = findVisible(params[0], viewer);
      const item = ev.bringItems.find((i) => i.id === params[1]);
      if (!item) throw notFound();
      item.claims = item.claims.filter((c) => c.memberId !== viewer);
      return [200, toEvent(ev, viewer)];
    }],
  ];

  /** Handles one request. Returns { status, body, headers }. */
  function handle(method, url, body, viewer = meId) {
    const { pathname, searchParams } = new URL(url, 'http://mock');
    try {
      for (const [m, re, fn] of handlers) {
        const match = pathname.match(re);
        if (match && m === method) {
          const [status, resBody, headers] = fn({ viewer, params: match.slice(1), query: searchParams, body });
          return { status, body: resBody, headers: headers ?? {} };
        }
      }
      throw notFound();
    } catch (err) {
      if (err instanceof ApiProblem) {
        const { status, code, title, detail, fieldErrors } = err;
        return { status, body: { type: 'about:blank', title, status, code, detail, fieldErrors }, headers: {}, problem: true };
      }
      throw err;
    }
  }

  return { handle, db: () => db };
}

export function startServer({ port = 3000, meId = process.env.MOCK_USER || ME_ID, delayMs = Number(process.env.MOCK_DELAY_MS ?? 0) } = {}) {
  const api = createMockApi({ meId });
  const cors = {
    'Access-Control-Allow-Origin': process.env.MOCK_ORIGIN || 'http://localhost:4200',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-XSRF-TOKEN',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'Location',
  };
  const server = createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors).end();
      return;
    }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body;
      try {
        body = raw ? JSON.parse(raw) : undefined;
      } catch {
        res.writeHead(400, { ...cors, 'Content-Type': 'application/problem+json' })
          .end(JSON.stringify({ title: 'Invalid JSON', status: 400, code: 'common.invalid-json' }));
        return;
      }
      setTimeout(() => {
        const out = api.handle(req.method, req.url, body);
        const type = out.problem ? 'application/problem+json' : 'application/json';
        res.writeHead(out.status, { ...cors, ...out.headers, ...(out.body !== undefined ? { 'Content-Type': type } : {}) });
        res.end(out.body !== undefined ? JSON.stringify(out.body) : undefined);
        console.log(`${req.method} ${req.url} -> ${out.status}`);
      }, delayMs);
    });
  });
  server.listen(port, () => console.log(`Samvær mock API on http://localhost:${port} (signed in as ${meId})`));
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer({ port: Number(process.env.PORT ?? 3000) });
}
