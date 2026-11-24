import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, concatMap, exhaustMap, map, switchMap, tap } from 'rxjs/operators';
import { toApiError } from '@core/http/api-error';
import { PlatformApiService } from '@core/platform/platform-api.service';
import { EventsApiService } from '../data-access/events-api.service';
import { EventDetail } from '../models/event.models';
import { EventsApiActions, EventsPageActions } from './events.actions';

/** Talks to the API. Holds no rules: what the backend answers is what the page shows. */
@Injectable()
export class EventsEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(EventsApiService);
  private readonly platform = inject(PlatformApiService);
  private readonly router = inject(Router);

  loadEvents$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EventsPageActions.loadEvents),
      switchMap(() =>
        this.api.listEvents({ size: 50 }).pipe(
          map((page) => EventsApiActions.eventsLoaded({ page })),
          catchError((error) => of(EventsApiActions.eventsLoadFailed({ error: toApiError(error) }))),
        ),
      ),
    ),
  );

  openEvent$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EventsPageActions.openEvent),
      switchMap(({ eventId }) =>
        this.api.getEvent(eventId).pipe(
          map((event) => EventsApiActions.eventLoaded({ event })),
          catchError((error) => of(EventsApiActions.eventLoadFailed({ error: toApiError(error) }))),
        ),
      ),
    ),
  );

  loadFormOptions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EventsPageActions.loadFormOptions),
      switchMap(() =>
        forkJoin({ groups: this.platform.listMyGroups(), members: this.platform.listMembers() }).pipe(
          map(({ groups, members }) => EventsApiActions.formOptionsLoaded({ groups, members })),
          catchError((error) => of(EventsApiActions.formOptionsFailed({ error: toApiError(error) }))),
        ),
      ),
    ),
  );

  /** RSVP and bring-list changes. Each one answers with the whole event. */
  changeEvent$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        EventsPageActions.setRsvp,
        EventsPageActions.claimItem,
        EventsPageActions.unclaimItem,
        EventsPageActions.addBringItem,
        EventsPageActions.removeBringItem,
      ),
      concatMap((action) =>
        this.requestFor(action).pipe(
          map((event) => EventsApiActions.eventChanged({ event })),
          catchError((error) => of(EventsApiActions.changeFailed({ eventId: action.eventId, error: toApiError(error) }))),
        ),
      ),
    ),
  );

  /** After a conflict (someone was quicker), fetch the event again so the page shows the truth. */
  reloadAfterConflict$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EventsApiActions.changeFailed),
      switchMap(({ eventId, error }) =>
        error.status === 409
          ? this.api.getEvent(eventId).pipe(
              map((event) => EventsApiActions.eventChanged({ event })),
              catchError(() => of()),
            )
          : of(),
      ),
    ),
  );

  createEvent$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EventsPageActions.createEvent),
      exhaustMap(({ input }) =>
        this.api.createEvent(input).pipe(
          map((event) => EventsApiActions.eventSaved({ event })),
          catchError((error) => of(EventsApiActions.saveFailed({ error: toApiError(error) }))),
        ),
      ),
    ),
  );

  updateEvent$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EventsPageActions.updateEvent),
      exhaustMap(({ eventId, update }) =>
        this.api.updateEvent(eventId, update).pipe(
          map((event) => EventsApiActions.eventSaved({ event })),
          catchError((error) => of(EventsApiActions.saveFailed({ error: toApiError(error) }))),
        ),
      ),
    ),
  );

  cancelEvent$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EventsPageActions.cancelEvent),
      exhaustMap(({ eventId }) =>
        this.api.cancelEvent(eventId).pipe(
          map(() => EventsApiActions.eventCancelled({ eventId })),
          catchError((error) => of(EventsApiActions.saveFailed({ error: toApiError(error) }))),
        ),
      ),
    ),
  );

  navigateAfterSave$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(EventsApiActions.eventSaved),
        tap(({ event }) => this.router.navigate(['/events', event.id])),
      ),
    { dispatch: false },
  );

  navigateAfterCancel$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(EventsApiActions.eventCancelled),
        tap(() => this.router.navigate(['/events'])),
      ),
    { dispatch: false },
  );

  private requestFor(
    action:
      | ReturnType<typeof EventsPageActions.setRsvp>
      | ReturnType<typeof EventsPageActions.claimItem>
      | ReturnType<typeof EventsPageActions.unclaimItem>
      | ReturnType<typeof EventsPageActions.addBringItem>
      | ReturnType<typeof EventsPageActions.removeBringItem>,
  ): Observable<EventDetail> {
    switch (action.type) {
      case EventsPageActions.setRsvp.type:
        return this.api.setRsvp(action.eventId, action.status);
      case EventsPageActions.claimItem.type:
        return this.api.claimItem(action.eventId, action.itemId);
      case EventsPageActions.unclaimItem.type:
        return this.api.unclaimItem(action.eventId, action.itemId);
      case EventsPageActions.addBringItem.type:
        return this.api.addBringItem(action.eventId, action.item);
      case EventsPageActions.removeBringItem.type:
        return this.api.removeBringItem(action.eventId, action.itemId);
    }
  }
}
