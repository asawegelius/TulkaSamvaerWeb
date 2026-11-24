import { formatWhen, toDateInput, toInstant, toTimeInput } from './event-format';

describe('event formatting', () => {
  const local = (y: number, m: number, d: number, hh = 0, mm = 0) => new Date(y, m - 1, d, hh, mm).toISOString();

  it('shows a one-day event with its start time', () => {
    expect(formatWhen(local(2027, 1, 15, 18), local(2027, 1, 15, 22), false)).toBe('Fri 15 Jan · 18:00');
  });

  it('leaves out the time for all-day events', () => {
    expect(formatWhen(local(2026, 12, 24), local(2026, 12, 24, 23, 59), true)).toBe('Thu 24 Dec');
  });

  it('shows a weekend as a range', () => {
    expect(formatWhen(local(2027, 1, 15, 18), local(2027, 1, 17, 15), false)).toBe('Fri 15 – Sun 17 Jan');
  });

  it('round-trips form inputs through an instant', () => {
    const iso = toInstant('2027-01-15', '18:30');
    expect(toDateInput(iso)).toBe('2027-01-15');
    expect(toTimeInput(iso)).toBe('18:30');
  });
});
