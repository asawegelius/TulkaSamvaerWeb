import { Routes } from '@angular/router';
import { SECTIONS, sortedSections } from '@core/sections/sections';

/**
 * Lazy routes built from the section registry. Adding a section means adding
 * one entry to SECTIONS, not editing this file.
 */
export function buildRoutes(sections = SECTIONS): Routes {
  const ordered = sortedSections(sections);
  const home = ordered[0]?.key ?? '';
  return [
    { path: '', pathMatch: 'full', redirectTo: home },
    ...ordered.map((section) => ({ path: section.key, title: `${section.title} · Samvær`, loadChildren: section.loadRoutes })),
    { path: '**', redirectTo: home },
  ];
}

export const APP_ROUTES: Routes = buildRoutes();
