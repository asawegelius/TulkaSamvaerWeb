# Dates and time zones

One set of rules for every section, in the API, the Spring Boot backend and the Angular app. Family members may live in different countries or travel, and a yearly birthday must stay at 13:00 through daylight saving, so "just use local time" is not enough.

## Three kinds of value

| Kind | What it is | JSON | Example | Java | PostgreSQL |
| --- | --- | --- | --- | --- | --- |
| `Instant` | A moment in time | ISO 8601 in UTC, always with `Z` | `2026-12-24T14:00:00Z` | `Instant` | `timestamptz` |
| `LocalDate` | A calendar date, no time, no zone | ISO 8601 date | `2026-12-24` | `LocalDate` | `date` |
| `TimeZone` | Where a wall-clock time belongs | IANA name | `Europe/Copenhagen` | `ZoneId` | `text` |

Never send a time with an offset (`+01:00`) or without a zone (`2026-12-24T15:00`). The contract defines `Instant`, `LocalDate` and `TimeZone` once in `components/schemas` and every section reuses them.

## Which one to use

- **Something that happens at a moment** (an event, a booking check-in time, a message): `Instant`, plus the `timeZone` it was planned in when people think of it as a wall-clock time ("dinner at 18:00").
- **Something that is just a date** (a birthday, a sowing date, a garden diary entry, booking nights): `LocalDate`. No zone, so it never shifts a day for someone abroad.
- **Something that repeats** (a yearly birthday, a weekly club): the series keeps its `timeZone`, and every occurrence has the same wall-clock time in that zone. 13:00 in Copenhagen is 12:00 UTC in winter and 11:00 UTC in summer; the backend works that out with `ZonedDateTime`, never by adding 365 days of seconds.
- **All-day items**: `allDay: true`, `startsAt` at midnight at the start of the first day and `endsAt` at midnight after the last day, both in the item's `timeZone`. The end is exclusive, like every other end.
- **Ranges in queries** (`from`, `to`): `Instant`s. `from` is inclusive, `to` is exclusive. When `from` is left out, "today" means today in the member's own zone (`Me.timeZone`).

## Whose time zone

- Every member has a `timeZone` on `GET /api/v1/me`. Until the app knows it, it uses the browser's zone.
- Things planned on a wall clock are shown in **their own** zone: a dinner at our house at 18:00 shows 18:00 to everyone. When the viewer's zone is different, the UI adds the zone name ("18:00 CET").
- "Today", "this week" and calendar grids use the **viewer's** zone.
- Forms create new items in the viewer's zone, and edit existing ones in the item's zone.

## Backend notes

- Jackson: `WRITE_DATES_AS_TIMESTAMPS` off, so `Instant` serialises as `2026-12-24T14:00:00Z` and `LocalDate` as `2026-12-24`.
- Run the JVM and the database session in UTC, so nothing depends on the server's zone.
- Validate `TimeZone` with `ZoneId.of(...)`; answer 400 `common.validation` for unknown zones.
- Expand recurring series with `ZonedDateTime` in the series zone. For a wall time that does not exist (the skipped spring hour), move it forward by the gap; for one that happens twice (autumn), use the first.

## Frontend notes

- `core/time/zoned-time.ts` converts between instants and wall times in any zone, with the same skipped and repeated hour rules as the backend.
- `core/time/date-format.ts` formats dates, times and ranges in a given zone. Sections use these instead of `new Date().toLocaleString()` or the machine's zone.
- `core/time/time-zone.service.ts` holds the viewer's zone.
- Tests pass explicit zones, so they give the same result on any machine.
