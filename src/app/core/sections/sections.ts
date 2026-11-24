import { Routes } from '@angular/router';

/**
 * One entry per section of the app. The shell builds its menu from this list
 * and `app.routes.ts` builds the lazy routes from it.
 *
 * Later, `GET /api/v1/me/sections` decides which entries the current member sees.
 * The backend enforces the same rule on every API call; hiding a menu entry is
 * only a convenience.
 */
export interface SectionDefinition {
  /** Shared key: Angular feature folder, Spring Boot module, API path and route. */
  key: string;
  title: string;
  /** Name of an icon in the shell's icon set. */
  icon: 'calendar' | 'event' | 'recipe' | 'garden' | 'chat' | 'booking';
  order: number;
  loadRoutes: () => Promise<Routes>;
}

export const SECTIONS: SectionDefinition[] = [
  {
    key: 'events',
    title: 'Events',
    icon: 'event',
    order: 30,
    loadRoutes: () => import('@features/events/events.routes').then((m) => m.EVENTS_ROUTES),
  },
];

/** Sections in menu order. */
export function sortedSections(sections: SectionDefinition[] = SECTIONS): SectionDefinition[] {
  return [...sections].sort((a, b) => a.order - b.order);
}
