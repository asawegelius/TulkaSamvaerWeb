import { Instant, LocalDate, TimeZone, addDays, toWallTime } from './zoned-time';

// Display helpers shared by every section. They only format; they decide nothing.

const LOCALE = 'en-GB';
const cache = new Map<string, Intl.DateTimeFormat>();

function fmt(timeZone: TimeZone, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE, { timeZone, ...options });
    cache.set(key, f);
  }
  return f;
}

const clean = (s: string) => s.replace(',', '');
const noon = (date: LocalDate) => `${date}T12:00:00Z`;

/** "Fri 15 Jan" for a calendar date. */
export function formatDate(date: LocalDate): string {
  return clean(fmt('UTC', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(noon(date))));
}

/** "18:00" in the zone. */
export function formatTime(instant: Instant, timeZone: TimeZone): string {
  return fmt(timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant));
}

/** "Fri 18:00" in the zone. */
export function formatWeekdayTime(instant: Instant, timeZone: TimeZone): string {
  return `${fmt(timeZone, { weekday: 'short' }).format(new Date(instant))} ${formatTime(instant, timeZone)}`;
}

/** Short zone name at that moment, for example "CET", "CEST" or "GMT+1". */
export function formatZone(instant: Instant, timeZone: TimeZone): string {
  const part = fmt(timeZone, { timeZoneName: 'short' }).formatToParts(new Date(instant)).find((p) => p.type === 'timeZoneName');
  return part?.value ?? timeZone;
}

/**
 * When something happens, in its own time zone:
 * "Fri 15 Jan · 18:00", "Thu 24 Dec" (all day) or "Fri 15 – Sun 17 Jan".
 *
 * All-day items end at the start of the day after their last day (exclusive end),
 * per docs/dates-and-time-zones.md.
 */
export function formatRange(startsAt: Instant, endsAt: Instant, allDay: boolean, timeZone: TimeZone): string {
  const start = toWallTime(startsAt, timeZone);
  const end = toWallTime(endsAt, timeZone);
  const lastDay = allDay ? addDays(end.date, -1) : end.date;
  if (lastDay <= start.date) {
    const day = formatDate(start.date);
    return allDay ? day : `${day} · ${start.time}`;
  }
  const sameMonth = start.date.slice(0, 7) === lastDay.slice(0, 7);
  const startText = sameMonth
    ? clean(fmt('UTC', { weekday: 'short', day: 'numeric' }).format(new Date(noon(start.date))))
    : formatDate(start.date);
  return `${startText} – ${formatDate(lastDay)}`;
}
