import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  BringItemInput, EventInput, EventUpdate, RsvpAnswer,
} from '../models/event.models';
import { EventsPageActions } from '../state/events.actions';
import { eventsFeature } from '../state/events.reducer';

/** The only thing events pages talk to. */
@Injectable()
export class EventsFacade {
  private readonly store = inject(Store);

  readonly events = this.store.selectSignal(eventsFeature.selectEventList);
  readonly listLoading = this.store.selectSignal(eventsFeature.selectListLoading);
  readonly listError = this.store.selectSignal(eventsFeature.selectListError);
  readonly selected = this.store.selectSignal(eventsFeature.selectSelected);
  readonly detailLoading = this.store.selectSignal(eventsFeature.selectDetailLoading);
  readonly detailError = this.store.selectSignal(eventsFeature.selectDetailError);
  readonly pending = this.store.selectSignal(eventsFeature.selectPending);
  readonly saving = this.store.selectSignal(eventsFeature.selectSaving);
  readonly error = this.store.selectSignal(eventsFeature.selectError);
  readonly groups = this.store.selectSignal(eventsFeature.selectGroups);
  readonly members = this.store.selectSignal(eventsFeature.selectMembers);

  loadEvents(): void {
    this.store.dispatch(EventsPageActions.loadEvents());
  }

  openEvent(eventId: string): void {
    this.store.dispatch(EventsPageActions.openEvent({ eventId }));
  }

  loadFormOptions(): void {
    this.store.dispatch(EventsPageActions.loadFormOptions());
  }

  setRsvp(eventId: string, status: RsvpAnswer): void {
    this.store.dispatch(EventsPageActions.setRsvp({ eventId, status }));
  }

  claimItem(eventId: string, itemId: string): void {
    this.store.dispatch(EventsPageActions.claimItem({ eventId, itemId }));
  }

  unclaimItem(eventId: string, itemId: string): void {
    this.store.dispatch(EventsPageActions.unclaimItem({ eventId, itemId }));
  }

  addBringItem(eventId: string, item: BringItemInput): void {
    this.store.dispatch(EventsPageActions.addBringItem({ eventId, item }));
  }

  removeBringItem(eventId: string, itemId: string): void {
    this.store.dispatch(EventsPageActions.removeBringItem({ eventId, itemId }));
  }

  createEvent(input: EventInput): void {
    this.store.dispatch(EventsPageActions.createEvent({ input }));
  }

  updateEvent(eventId: string, update: EventUpdate): void {
    this.store.dispatch(EventsPageActions.updateEvent({ eventId, update }));
  }

  cancelEvent(eventId: string): void {
    this.store.dispatch(EventsPageActions.cancelEvent({ eventId }));
  }

  dismissError(): void {
    this.store.dispatch(EventsPageActions.dismissError());
  }
}
