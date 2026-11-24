import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, concatMap, exhaustMap, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { toApiError } from '@core/http/api-error';
import { PlatformApiService } from '@core/platform/platform-api.service';
import { EventsApiService } from '../data-access/events-api.service';
import { EventDetail } from '../models/event.models';
import { EventsApiActions, EventsPageActions } from './events.actions';
import { PAGE_SIZE, eventsFeature } from './events.reducer';
import { pendingKeys } from './pending-keys';

type ChangeAction =
  | ReturnType<typeof EventsPageActions.setRsvp>
  | ReturnType<typeof EventsPageActions.claimItem>
  | ReturnType<typeof EventsPageActions.unclaimItem>
  | ReturnType<typeof EventsPageActions.addBringItem>
  | ReturnType<typeof EventsPageActions.removeBringItem>;

/** The pending key a change adds in the reducer, and removes when it finishes. */
export function keyFor(action: ChangeAction): string {
  switch (action.type) {
    case EventsPageActions.setRsvp.type:
      return pendingKeys.rsvp(action.eventId);
    case EventsPageActions.addBringItem.type:
      return pendingKeys.addItem(action.eventId);
    default:
      return pendingKeys.item(action.itemId);
  }
}

/** Talks to the API. Holds no rules: what the backend answers is what the page shows. */
@Injectable()
export class EventsEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(EventsApiService);
  private readonly platform = inject(PlatformApiService);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  loadEvents$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EventsPageActions.loadEvents),
      switchMap(() => this.loadPage(0)),
    ),
  );

  /** Next page, appended to the list. exhaustMap ignores extra clicks while a page is loading. */
  loadMoreEvents$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EventsPageActions.loadMoreEvents),
      withLatestFrom(this.store.select(eventsFeature.selectPage)),
      exhaustMap(([, page]) => this.loadPage(page + 1)),
    ),
  );

  openEvent$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EventsPageActions.openEvent),
      switchMap(({ eventId }) =>
        this.api.getEvent(eventId).pipe(
          map((event) => EventsApiActions.eventLoaded({ event })),
          catchError((error) => of(EventsApiActions.eventLoadFailed({ eventId, error: toApiError(error) }))),
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

  /**
   * RSVP and bring-list changes. Each one answers with the whole event.
   * concatMap runs them one at a time in the order the member made them, and
   * each answer carries its pending key so overlapping changes clear correctly.
   */
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
          map((event) => EventsApiActions.eventChanged({ key: keyFor(action), event })),
          catchError((error) =>
            of(EventsApiActions.changeFailed({ key: keyFor(action), eventId: action.eventId, error: toApiError(error) })),
          ),
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
              map((event) => EventsApiActions.eventRefreshed({ event })),
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

  private loadPage(page: number) {
    return this.api.listEvents({ page, size: PAGE_SIZE }).pipe(
      map((result) => EventsApiActions.eventsLoaded({ page: result })),
      catchError((error) => of(EventsApiActions.eventsLoadFailed({ error: toApiError(error) }))),
    );
  }

  private requestFor(action: ChangeAction): Observable<EventDetail> {
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
