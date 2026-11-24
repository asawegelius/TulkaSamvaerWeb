// Display helpers only: they format what the API sent and decide nothing.

const LOCALE = 'en-GB';
const dayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
const dayOnlyFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const clean = (s: string) => s.replace(',', '');

/** "Fri 15 Jan · 18:00", "Thu 24 Dec" or "Fri 15 – Sun 17 Jan". */
export function formatWhen(startsAt: string, endsAt: string, allDay: boolean): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (sameDay(start, end)) {
    const day = clean(dayFmt.format(start));
    return allDay ? day : `${day} · ${timeFmt.format(start)}`;
  }
  const startText = start.getMonth() === end.getMonth() ? clean(dayOnlyFmt.format(start)) : clean(dayFmt.format(start));
  return `${startText} – ${clean(dayFmt.format(end))}`;
}

/** "Fri 18:00" for a programme line. */
export function formatProgrammeTime(at: string): string {
  const d = new Date(at);
  return `${new Intl.DateTimeFormat(LOCALE, { weekday: 'short' }).format(d)} ${timeFmt.format(d)}`;
}

/** Calendar date for an <input type=date>, in local time. */
export function toDateInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Time for an <input type=time>, in local time. */
export function toTimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local date and time from form inputs, as a UTC instant for the API. */
export function toInstant(date: string, time: string): string {
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}
