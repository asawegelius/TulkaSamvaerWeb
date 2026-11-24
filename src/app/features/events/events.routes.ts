import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { EventsApiService } from './data-access/events-api.service';
import { EventsFacade } from './facade/events.facade';
import { EventDetailPageComponent } from './pages/event-detail-page/event-detail-page.component';
import { EventFormPageComponent } from './pages/event-form-page/event-form-page.component';
import { EventsListPageComponent } from './pages/events-list-page/events-list-page.component';
import { EventsEffects } from './state/events.effects';
import { eventsFeature } from './state/events.reducer';

export const EVENTS_ROUTES: Routes = [
  {
    path: '',
    providers: [EventsApiService, EventsFacade, provideState(eventsFeature), provideEffects(EventsEffects)],
    children: [
      { path: '', component: EventsListPageComponent },
      { path: 'new', component: EventFormPageComponent, title: 'New event · Samvær' },
      { path: ':eventId', component: EventDetailPageComponent },
      { path: ':eventId/edit', component: EventFormPageComponent, title: 'Edit event · Samvær' },
    ],
  },
];
