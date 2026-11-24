import { fromWallTime } from '@core/time/zoned-time';
import { formatEventWhen } from './event-format';

const CPH = 'Europe/Copenhagen';

describe('formatEventWhen', () => {
  const event = {
    startsAt: fromWallTime('2027-01-15', '18:00', CPH),
    endsAt: fromWallTime('2027-01-15', '22:00', CPH),
    allDay: false,
    timeZone: CPH,
  };

  it('shows the event in its own zone without a label for people at home', () => {
    expect(formatEventWhen(event, CPH)).toBe('Fri 15 Jan · 18:00');
  });

  it('keeps the planned time and adds the zone for someone abroad', () => {
    expect(formatEventWhen(event, 'America/New_York')).toMatch(/^Fri 15 Jan · 18:00 (CET|GMT\+1)$/);
  });

  it('leaves the zone out of multi-day ranges, which show no clock time', () => {
    const weekend = { ...event, endsAt: fromWallTime('2027-01-17', '15:00', CPH) };
    expect(formatEventWhen(weekend, 'America/New_York')).toBe('Fri 15 – Sun 17 Jan');
  });
});
