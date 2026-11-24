import { Injectable, signal } from '@angular/core';
import { TimeZone, browserTimeZone } from './zoned-time';

/**
 * The time zone of the person using the app. Starts as the browser's zone;
 * set it from `GET /api/v1/me` (`timeZone`) once the member is known.
 */
@Injectable({ providedIn: 'root' })
export class TimeZoneService {
  private readonly zone = signal<TimeZone>(browserTimeZone());
  readonly timeZone = this.zone.asReadonly();

  set(timeZone: TimeZone): void {
    this.zone.set(timeZone);
  }
}
