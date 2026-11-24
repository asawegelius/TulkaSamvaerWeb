import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SECTIONS } from '@core/sections/sections';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  it('builds the menu from the section registry', async () => {
    TestBed.configureTestingModule({ imports: [AppShellComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const links = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a.nv'));
    expect(links.map((a) => a.textContent?.trim())).toEqual(SECTIONS.map((s) => s.title));
    expect(links[0].getAttribute('href')).toBe('/events');
  });
});
