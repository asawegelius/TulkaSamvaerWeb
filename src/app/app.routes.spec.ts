import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { appConfig } from './app.config';
import { EventsFacade } from './features/events/facade/events.facade';
import { eventFixture, summaryFixture } from './features/events/testing/event.fixtures';

const API = 'https://api.example.com/api/v1';

describe('Application routing with the events section', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: APP_CONFIG, useValue: { apiUrl: 'https://api.example.com' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each(['/', '/events', '/unknown'])('lands on the events list when visiting %s', async (url) => {
    const harness = await RouterTestingHarness.create(url);
    expect(TestBed.inject(Router).url).toBe('/events');
    expect(TestBed.inject(EventsFacade, null)).toBeNull();

    http.expectOne(`${API}/events?size=50`).flush({ items: [summaryFixture()], page: 0, size: 50, totalItems: 1 });
    harness.detectChanges();
    await harness.fixture.whenStable();

    expect(harness.routeNativeElement?.textContent).toContain('Board game weekend');
    expect(harness.routeNativeElement?.textContent).toContain('Best friends');
  });

  it('shows an event, sends an RSVP and claims an item', async () => {
    const harness = await RouterTestingHarness.create('/events/e-1');
    http.expectOne(`${API}/events/e-1`).flush(eventFixture());
    harness.detectChanges();
    await harness.fixture.whenStable();
    const page = harness.routeNativeElement!;
    expect(page.textContent).toContain('Who brings what');
    expect(page.textContent).toContain('Guest apartment');

    const going = Array.from(page.querySelectorAll<HTMLButtonElement>('app-rsvp-control button')).find((b) => b.textContent?.trim() === 'Going')!;
    going.click();
    const rsvp = http.expectOne(`${API}/events/e-1/rsvp`);
    expect(rsvp.request.body).toEqual({ status: 'GOING', note: null });
    rsvp.flush(eventFixture({ myRsvp: 'GOING' }));
    harness.detectChanges();
    expect(going.getAttribute('aria-pressed')).toBe('true');

    const claim = Array.from(page.querySelectorAll<HTMLButtonElement>('app-bring-list button')).find((b) => b.textContent?.includes("I'll take it"))!;
    claim.click();
    http.expectOne((r) => r.method === 'PUT' && r.url === `${API}/events/e-1/bring-items/i-1/claim`).flush(eventFixture({
      bringItems: [{ id: 'i-1', title: 'Saturday lunch', details: null, slots: 1, allowedActions: ['unclaim'],
        claimedBy: [{ member: { id: 'm-1', displayName: 'Åsa', initials: 'Å', avatarMediaId: null }, note: null }] }],
    }));
    harness.detectChanges();
    expect(page.querySelector('app-bring-list')?.textContent).toContain('Give it back');
  });

  it('shows the API problem when an event is not visible', async () => {
    const harness = await RouterTestingHarness.create('/events/secret');
    http.expectOne(`${API}/events/secret`).flush(
      { title: 'Not found', status: 404, code: 'common.not-found' },
      { status: 404, statusText: 'Not Found' },
    );
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Event not found');
  });
});
