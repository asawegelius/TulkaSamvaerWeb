/**
 * Dates and time zones, the same way for every section.
 * The rules are in docs/dates-and-time-zones.md:
 *
 * - `Instant`: a moment, sent as UTC ISO 8601 with `Z` (`2026-12-24T14:00:00Z`).
 * - `LocalDate`: a calendar date without time (`2026-12-24`), for birthdays and all-day things.
 * - `TimeZone`: an IANA zone (`Europe/Copenhagen`). Wall-clock times belong to a zone.
 *
 * No library: Intl knows every zone and its daylight saving rules.
 */

export type Instant = string;
export type LocalDate = string;
/** `HH:mm`, 24-hour. */
export type LocalTime = string;
export type TimeZone = string;

export interface WallTime {
  date: LocalDate;
  time: LocalTime;
}

const partsFormatters = new Map<TimeZone, Intl.DateTimeFormat>();

function partsFormatter(timeZone: TimeZone): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

function fields(ms: number, timeZone: TimeZone) {
  const parts = partsFormatter(timeZone).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

/** Offset of the zone from UTC at that moment, in milliseconds. */
function offsetMs(ms: number, timeZone: TimeZone): number {
  const f = fields(ms, timeZone);
  return Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second) - Math.floor(ms / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The time zone of this browser, used until the member has chosen one. */
export function browserTimeZone(): TimeZone {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** What a clock on the wall in `timeZone` shows at `instant`. */
export function toWallTime(instant: Instant, timeZone: TimeZone): WallTime {
  const f = fields(Date.parse(instant), timeZone);
  return { date: `${f.year}-${pad(f.month)}-${pad(f.day)}`, time: `${pad(f.hour)}:${pad(f.minute)}` };
}

/**
 * The instant when a clock in `timeZone` shows `date` and `time`.
 * In the hour skipped when clocks go forward, the time moves forward by the gap;
 * in the hour that repeats when clocks go back, the first one is used.
 */
export function fromWallTime(date: LocalDate, time: LocalTime, timeZone: TimeZone): Instant {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  const wanted = `${pad(hh)}:${pad(mm)}`;
  // The zone's offset the day before, at that moment, and the day after covers any change.
  const before = offsetMs(asUtc - 864e5, timeZone);
  const offsets = [before, offsetMs(asUtc, timeZone), offsetMs(asUtc + 864e5, timeZone)];
  const valid = offsets
    .map((offset) => asUtc - offset)
    .filter((ms) => toWallTime(new Date(ms).toISOString(), timeZone).time === wanted);
  // Repeated hour: take the first. Skipped hour: keep the offset from before the change, which lands after the gap.
  const ms = valid.length ? Math.min(...valid) : asUtc - before;
  return new Date(ms).toISOString();
}

/** The calendar date `days` after `date`. */
export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Today's date in `timeZone`. */
export function today(timeZone: TimeZone, now: Date = new Date()): LocalDate {
  return toWallTime(now.toISOString(), timeZone).date;
}
