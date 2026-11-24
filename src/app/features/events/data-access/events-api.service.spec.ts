import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { EventsApiService } from './events-api.service';

describe('EventsApiService', () => {
  let api: EventsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EventsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    api = TestBed.inject(EventsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists events with page and size', () => {
    api.listEvents({ size: 50 }).subscribe();
    const req = http.expectOne('https://api.test/api/v1/events?size=50');
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], page: 0, size: 50, totalItems: 0 });
  });

  it('puts an RSVP', () => {
    api.setRsvp('e-1', 'CANT').subscribe();
    const req = http.expectOne('https://api.test/api/v1/events/e-1/rsvp');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'CANT', note: null });
    req.flush({});
  });

  it('claims and gives back a bring-list item', () => {
    api.claimItem('e-1', 'i-1').subscribe();
    expect(http.expectOne((r) => r.method === 'PUT' && r.url === 'https://api.test/api/v1/events/e-1/bring-items/i-1/claim')).toBeTruthy();
    api.unclaimItem('e-1', 'i-1').subscribe();
    expect(http.expectOne((r) => r.method === 'DELETE' && r.url === 'https://api.test/api/v1/events/e-1/bring-items/i-1/claim')).toBeTruthy();
  });
});
