import { formatRange, formatZone } from './date-format';
import { addDays, fromWallTime, isValidTimeZone, toWallTime } from './zoned-time';

const CPH = 'Europe/Copenhagen';

describe('zoned time', () => {
  it('turns a wall time into the right UTC instant in winter and summer', () => {
    expect(fromWallTime('2027-01-15', '18:00', CPH)).toBe('2027-01-15T17:00:00.000Z');
    expect(fromWallTime('2027-07-15', '18:00', CPH)).toBe('2027-07-15T16:00:00.000Z');
  });

  it('keeps 13:00 as 13:00 across daylight saving, which yearly events rely on', () => {
    const winter = fromWallTime('2027-01-09', '13:00', CPH);
    const summer = fromWallTime('2027-07-09', '13:00', CPH);
    expect(toWallTime(winter, CPH).time).toBe('13:00');
    expect(toWallTime(summer, CPH).time).toBe('13:00');
    expect(winter.slice(11, 16)).toBe('12:00');
    expect(summer.slice(11, 16)).toBe('11:00');
  });

  it('moves a time in the skipped spring hour forward, and picks the first of a repeated autumn hour', () => {
    // 28 March 2027: 02:00 becomes 03:00 in Copenhagen.
    expect(toWallTime(fromWallTime('2027-03-28', '02:30', CPH), CPH).time).toBe('03:30');
    // 31 October 2027: 02:00–03:00 happens twice; the first is still summer time (UTC+2).
    expect(fromWallTime('2027-10-31', '02:30', CPH)).toBe('2027-10-31T00:30:00.000Z');
  });

  it('shows the same instant as different wall times in different zones', () => {
    const instant = '2027-01-15T17:00:00Z';
    expect(toWallTime(instant, CPH)).toEqual({ date: '2027-01-15', time: '18:00' });
    expect(toWallTime(instant, 'America/New_York')).toEqual({ date: '2027-01-15', time: '12:00' });
    expect(toWallTime(instant, 'Asia/Tokyo')).toEqual({ date: '2027-01-16', time: '02:00' });
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });

  it('knows valid zones', () => {
    expect(isValidTimeZone(CPH)).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});

describe('date formatting', () => {
  it('formats in the given zone, not the machine zone', () => {
    const start = fromWallTime('2027-01-15', '18:00', CPH);
    const end = fromWallTime('2027-01-15', '22:00', CPH);
    expect(formatRange(start, end, false, CPH)).toBe('Fri 15 Jan · 18:00');
    expect(formatRange(start, end, false, 'America/New_York')).toBe('Fri 15 Jan · 12:00');
  });

  it('treats the end of an all-day item as exclusive', () => {
    const start = fromWallTime('2026-12-24', '00:00', CPH);
    const end = fromWallTime('2026-12-25', '00:00', CPH);
    expect(formatRange(start, end, true, CPH)).toBe('Thu 24 Dec');
  });

  it('shows a weekend as a range', () => {
    expect(formatRange(fromWallTime('2027-01-15', '18:00', CPH), fromWallTime('2027-01-17', '15:00', CPH), false, CPH))
      .toBe('Fri 15 – Sun 17 Jan');
  });

  it('names the zone', () => {
    expect(formatZone('2027-01-15T17:00:00Z', CPH)).toMatch(/CET|GMT\+1/);
  });
});
