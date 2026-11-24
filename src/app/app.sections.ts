import { SectionDefinition } from '@core/sections/section-definition';

/**
 * The section registry. This is where the application puts its features
 * together: the shell builds its menu from it and `app.routes.ts` builds the
 * lazy routes from it. Adding a section means adding one entry here.
 */
export const APP_SECTIONS: readonly SectionDefinition[] = [
  {
    key: 'events',
    title: 'Events',
    icon: 'event',
    order: 30,
    loadRoutes: () => import('./features/events/events.routes').then((m) => m.EVENTS_ROUTES),
  },
];
