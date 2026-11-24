import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SECTIONS, SectionDefinition } from '@core/sections/section-definition';
import { AppShellComponent } from './app-shell.component';

const sections: SectionDefinition[] = [
  { key: 'recipes', title: 'Recipes', icon: 'recipe', order: 40, loadRoutes: async () => [] },
  { key: 'events', title: 'Events', icon: 'event', order: 30, loadRoutes: async () => [] },
];

describe('AppShellComponent', () => {
  it('builds the menu from the provided sections, in order', async () => {
    TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter([]), { provide: SECTIONS, useValue: sections }],
    });
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const links = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a.nv'));
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Events', 'Recipes']);
    expect(links[0].getAttribute('href')).toBe('/events');
  });
});
