import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from '@core/http/api-url.service';
import {
  BringItemInput, EventDetail, EventInput, EventPage, EventUpdate, InviteInput, RsvpAnswer,
} from '../models/event.models';
import { EVENTS_ENDPOINTS } from './events.endpoints';

/**
 * Typed client for the events part of api/openapi.yaml. It only sends requests:
 * every mutation answers with the whole event, so the UI just shows what comes back.
 */
@Injectable()
export class EventsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  private url(path: string): string {
    return this.apiUrl.create(path);
  }

  listEvents(query: { from?: string; to?: string; page?: number; size?: number } = {}): Observable<EventPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params = params.set(key, String(value));
    }
    return this.http.get<EventPage>(this.url(EVENTS_ENDPOINTS.events), { params });
  }

  getEvent(eventId: string): Observable<EventDetail> {
    return this.http.get<EventDetail>(this.url(EVENTS_ENDPOINTS.event(eventId)));
  }

  createEvent(input: EventInput): Observable<EventDetail> {
    return this.http.post<EventDetail>(this.url(EVENTS_ENDPOINTS.events), input);
  }

  updateEvent(eventId: string, update: EventUpdate): Observable<EventDetail> {
    return this.http.put<EventDetail>(this.url(EVENTS_ENDPOINTS.event(eventId)), update);
  }

  cancelEvent(eventId: string): Observable<void> {
    return this.http.delete<void>(this.url(EVENTS_ENDPOINTS.event(eventId)));
  }

  setRsvp(eventId: string, status: RsvpAnswer, note: string | null = null): Observable<EventDetail> {
    return this.http.put<EventDetail>(this.url(EVENTS_ENDPOINTS.rsvp(eventId)), { status, note });
  }

  invite(eventId: string, invite: InviteInput): Observable<EventDetail> {
    return this.http.post<EventDetail>(this.url(EVENTS_ENDPOINTS.invites(eventId)), invite);
  }

  addBringItem(eventId: string, item: BringItemInput): Observable<EventDetail> {
    return this.http.post<EventDetail>(this.url(EVENTS_ENDPOINTS.bringItems(eventId)), item);
  }

  removeBringItem(eventId: string, itemId: string): Observable<EventDetail> {
    return this.http.delete<EventDetail>(this.url(EVENTS_ENDPOINTS.bringItem(eventId, itemId)));
  }

  claimItem(eventId: string, itemId: string, note: string | null = null): Observable<EventDetail> {
    return this.http.put<EventDetail>(this.url(EVENTS_ENDPOINTS.claim(eventId, itemId)), { note });
  }

  unclaimItem(eventId: string, itemId: string): Observable<EventDetail> {
    return this.http.delete<EventDetail>(this.url(EVENTS_ENDPOINTS.claim(eventId, itemId)));
  }
}
