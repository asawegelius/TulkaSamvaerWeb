import { InjectionToken } from '@angular/core';
import { Routes } from '@angular/router';

/**
 * Describes one section of the app. Core only knows the shape; the list of
 * sections is composed at the application root (`app.sections.ts`), because
 * core must not import features.
 *
 * Later, `GET /api/v1/me/sections` decides which entries the current member sees.
 * The backend enforces the same rule on every API call; hiding a menu entry is
 * only a convenience.
 */
export interface SectionDefinition {
  /** Shared key: Angular feature folder, Spring Boot module, API path and route. */
  key: string;
  title: string;
  /** Name of an icon in the shared icon set. */
  icon: 'calendar' | 'event' | 'recipe' | 'garden' | 'chat' | 'booking';
  order: number;
  loadRoutes: () => Promise<Routes>;
}

/** The sections of the app, provided by the application root. */
export const SECTIONS = new InjectionToken<readonly SectionDefinition[]>('SECTIONS', {
  providedIn: 'root',
  factory: () => [],
});

/** Sections in menu order. */
export function sortedSections(sections: readonly SectionDefinition[]): SectionDefinition[] {
  return [...sections].sort((a, b) => a.order - b.order);
}
