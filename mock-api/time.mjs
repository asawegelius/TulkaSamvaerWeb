// Same rules as src/app/core/time/zoned-time.ts and docs/dates-and-time-zones.md,
// for the mock. The real backend uses java.time.

const pad = (n) => String(n).padStart(2, '0');
const formatters = new Map();

function fields(ms, timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  const parts = f.formatToParts(new Date(ms));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

const offsetMs = (ms, tz) => {
  const f = fields(ms, tz);
  return Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second) - Math.floor(ms / 1000) * 1000;
};

export function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return typeof tz === 'string' && tz.length > 0;
  } catch {
    return false;
  }
}

export function toWallTime(instant, tz) {
  const f = fields(Date.parse(instant), tz);
  return { date: `${f.year}-${pad(f.month)}-${pad(f.day)}`, time: `${pad(f.hour)}:${pad(f.minute)}` };
}

export function fromWallTime(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  const wanted = `${pad(hh)}:${pad(mm)}`;
  const before = offsetMs(asUtc - 864e5, tz);
  const valid = [before, offsetMs(asUtc, tz), offsetMs(asUtc + 864e5, tz)]
    .map((o) => asUtc - o)
    .filter((ms) => toWallTime(new Date(ms).toISOString(), tz).time === wanted);
  return new Date(valid.length ? Math.min(...valid) : asUtc - before).toISOString();
}

export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  const n = new Date(Date.UTC(y, m - 1, d + days));
  return `${n.getUTCFullYear()}-${pad(n.getUTCMonth() + 1)}-${pad(n.getUTCDate())}`;
}

export function addMonths(date, months) {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(Math.min(d, lastDay))}`;
}

export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
