import { formatRange, formatWeekdayTime, formatZone } from '@core/time/date-format';
import { TimeZone } from '@core/time/zoned-time';
import { EventSummary } from './event.models';

// Display helpers only: they format what the API sent and decide nothing.
// Times are shown in the event's own zone (docs/dates-and-time-zones.md).

/** "Fri 15 Jan · 18:00", with the zone name added when the viewer is somewhere else. */
export function formatEventWhen(event: Pick<EventSummary, 'startsAt' | 'endsAt' | 'allDay' | 'timeZone'>, viewerZone: TimeZone): string {
  const text = formatRange(event.startsAt, event.endsAt, event.allDay, event.timeZone);
  // The zone name only matters next to a clock time, so ranges and all-day events go without it.
  const showsTime = text.includes(':');
  return showsTime && event.timeZone !== viewerZone ? `${text} ${formatZone(event.startsAt, event.timeZone)}` : text;
}

/** "Fri 18:00" for a programme line, in the event's zone. */
export function formatProgrammeTime(at: string, timeZone: TimeZone): string {
  return formatWeekdayTime(at, timeZone);
}
