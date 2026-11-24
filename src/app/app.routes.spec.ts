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

    http.expectOne(`${API}/events?page=0&size=20`).flush({ items: [summaryFixture()], page: 0, size: 50, totalItems: 1 });
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

describe('Events routing: paging, edit errors and navigation during a change', () => {
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

  const many = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => summaryFixture({ id: `e-${from + i}`, title: `Walk ${from + i}`, startsAt: `2027-02-${String(1 + ((from + i) % 27)).padStart(2, '0')}T09:00:00Z` }));

  it('shows more than 50 events, one page at a time', async () => {
    const harness = await RouterTestingHarness.create('/events');
    const flushPage = async (page: number, items: ReturnType<typeof many>) => {
      http.expectOne(`${API}/events?page=${page}&size=20`).flush({ items, page, size: 20, totalItems: 55 });
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    const el = harness.routeNativeElement!;
    const more = () => Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Show more'));

    await flushPage(0, many(0, 20));
    expect(el.querySelectorAll('app-event-card')).toHaveLength(20);
    expect(el.textContent).toContain('20 of 55');

    more()!.click();
    await flushPage(1, many(20, 20));
    more()!.click();
    await flushPage(2, many(40, 15));

    expect(el.querySelectorAll('app-event-card')).toHaveLength(55);
    expect(more()).toBeUndefined();
  });

  it('shows the error on the edit page when the event cannot be read', async () => {
    const harness = await RouterTestingHarness.create('/events/gone/edit');
    http.expectOne(`${API}/me/groups`).flush([]);
    http.expectOne(`${API}/members`).flush([]);
    http.expectOne(`${API}/events/gone`).flush(
      { title: 'Not found', status: 404, code: 'common.not-found', detail: 'This event is gone.' },
      { status: 404, statusText: 'Not Found' },
    );
    harness.detectChanges();
    await harness.fixture.whenStable();

    expect(harness.routeNativeElement?.textContent).toContain('This event is gone.');
    expect(harness.routeNativeElement?.textContent).not.toContain('Loading');
  });

  it('keeps the new page when an answer for the old event arrives after navigating', async () => {
    const harness = await RouterTestingHarness.create('/events/e-1');
    http.expectOne(`${API}/events/e-1`).flush(eventFixture());
    harness.detectChanges();
    await harness.fixture.whenStable();

    const claim = Array.from(harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('app-bring-list button'))
      .find((b) => b.textContent?.includes("I'll take it"))!;
    claim.click();
    harness.detectChanges();
    expect(claim.disabled).toBe(true);
    const pendingClaim = http.expectOne((r) => r.url === `${API}/events/e-1/bring-items/i-1/claim`);

    await harness.navigateByUrl('/events/e-2');
    pendingClaim.flush(eventFixture({ title: 'Old event, claimed' }));
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('Old event, claimed');

    http.expectOne(`${API}/events/e-2`).flush(eventFixture({ id: 'e-2', title: 'Seed swap' }));
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Seed swap');
  });
});
