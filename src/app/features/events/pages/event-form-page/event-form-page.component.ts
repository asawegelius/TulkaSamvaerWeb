import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PageLayoutComponent } from '@shared/layouts/page-layout/page-layout.component';
import { EventFormComponent, EventFormValue } from '../../components/event-form/event-form.component';
import { EventsFacade } from '../../facade/events.facade';

/** Create (`/events/new`) and edit (`/events/:eventId/edit`). */
@Component({
  selector: 'app-event-form-page',
  standalone: true,
  imports: [RouterLink, IconComponent, PageLayoutComponent, EventFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sv-page-layout [heading]="eventId() ? 'Edit event' : 'New event'">
      <a slot="back" class="sv-btn sv-btn--quiet back" [routerLink]="eventId() ? ['/events', eventId()] : '/events'">
        <sv-icon name="back" [size]="18" />Back
      </a>
      @if (facade.error(); as error) {
        <p class="sv-error" role="alert">{{ error.message }}</p>
      }
      @if (!eventId() || event()) {
        <app-event-form [event]="event()" [groups]="facade.groups()" [members]="facade.members()"
                        [saving]="facade.saving()" [fieldErrors]="facade.error()?.fieldErrors ?? []"
                        (save)="save($event)" (cancel)="back()" />
      } @else {
        <p class="sv-muted" aria-live="polite">Loading…</p>
      }
    </sv-page-layout>
  `,
  styles: `.back { align-self: flex-start; margin: 0 0 8px -8px; }`,
})
export class EventFormPageComponent {
  protected readonly facade = inject(EventsFacade);
  private readonly router = inject(Router);

  /** Set on the edit route only. */
  readonly eventId = input<string>();

  protected readonly event = computed(() => {
    const e = this.facade.selected();
    return this.eventId() && e?.id === this.eventId() ? e : null;
  });

  constructor() {
    this.facade.dismissError();
    this.facade.loadFormOptions();
    effect(() => {
      const id = this.eventId();
      if (id && this.facade.selected()?.id !== id) this.facade.openEvent(id);
    });
  }

  protected save(value: EventFormValue): void {
    const id = this.eventId();
    const existing = this.event();
    if (id && existing) {
      const { recurrence, bringItems, invite, ...fields } = value;
      this.facade.updateEvent(id, { ...fields, version: existing.version });
    } else {
      this.facade.createEvent(value);
    }
  }

  protected back(): void {
    const id = this.eventId();
    this.router.navigate(id ? ['/events', id] : ['/events']);
  }
}
