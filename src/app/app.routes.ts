import { Routes } from '@angular/router';
import { SectionDefinition, sortedSections } from '@core/sections/section-definition';
import { APP_SECTIONS } from './app.sections';

/**
 * Lazy routes built from the section registry. Adding a section means adding
 * one entry to APP_SECTIONS, not editing this file.
 */
export function buildRoutes(sections: readonly SectionDefinition[] = APP_SECTIONS): Routes {
  const ordered = sortedSections(sections);
  const home = ordered[0]?.key ?? '';
  return [
    { path: '', pathMatch: 'full', redirectTo: home },
    ...ordered.map((section) => ({ path: section.key, title: `${section.title} · Samvær`, loadChildren: section.loadRoutes })),
    { path: '**', redirectTo: home },
  ];
}

export const APP_ROUTES: Routes = buildRoutes();
