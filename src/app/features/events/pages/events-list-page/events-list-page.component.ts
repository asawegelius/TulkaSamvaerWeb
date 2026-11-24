import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PageLayoutComponent } from '@shared/layouts/page-layout/page-layout.component';
import { EventCardComponent } from '../../components/event-card/event-card.component';
import { EventsFacade } from '../../facade/events.facade';
import { RsvpAnswer } from '../../models/event.models';

@Component({
  selector: 'app-events-list-page',
  standalone: true,
  imports: [RouterLink, IconComponent, PageLayoutComponent, EventCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sv-page-layout heading="Coming up">
      <p slot="meta" class="sv-muted">Plans with the people you actually see.</p>
      <a slot="actions" class="sv-btn" routerLink="new"><sv-icon name="plus" [size]="18" />New event</a>

      @if (facade.error(); as error) {
        <p class="sv-error" role="alert">{{ error.message }}</p>
      }
      @if (facade.listError() && facade.events().length === 0) {
        <div class="sv-card" role="alert">
          <p>{{ facade.listError() }}</p>
          <button type="button" class="sv-btn sv-btn--secondary" (click)="facade.loadEvents()">Try again</button>
        </div>
      } @else if (facade.listLoading() && facade.events().length === 0) {
        <p class="sv-muted" aria-live="polite">Loading events…</p>
      } @else {
        <div class="grid">
          @for (event of facade.events(); track event.id) {
            <app-event-card [event]="event" [busy]="facade.isPending(facade.keys.rsvp(event.id))" (answer)="answer(event.id, $event)" />
          } @empty {
            <div class="sv-card empty">
              <h2>Nothing planned yet</h2>
              <p class="sv-muted">Start with a dinner, a birthday or a weekend away.</p>
              <a class="sv-btn" routerLink="new">Plan something</a>
            </div>
          }
        </div>
        @if (facade.hasMore()) {
          <div class="more">
            @if (facade.listError(); as error) { <p class="sv-error" role="alert">{{ error }}</p> }
            <button type="button" class="sv-btn sv-btn--secondary" [disabled]="facade.listLoading()" (click)="facade.loadMoreEvents()">
              {{ facade.listLoading() ? 'Loading…' : 'Show more' }}
            </button>
            <span class="sv-meta">{{ facade.events().length }} of {{ facade.totalItems() }}</span>
          </div>
        }
      }
    </sv-page-layout>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 14px; }
    .empty { grid-column: 1 / -1; text-align: center; padding: 32px; }
    .empty p { margin: 0 auto 16px; }
    .more { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 20px; }
  `,
})
export class EventsListPageComponent implements OnInit {
  protected readonly facade = inject(EventsFacade);

  ngOnInit(): void {
    this.facade.loadEvents();
  }

  protected answer(eventId: string, status: RsvpAnswer): void {
    this.facade.setRsvp(eventId, status);
  }
}
