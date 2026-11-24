import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PageLayoutComponent } from '@shared/layouts/page-layout/page-layout.component';
import { AttendeeListComponent } from '../../components/attendee-list/attendee-list.component';
import { BringListComponent } from '../../components/bring-list/bring-list.component';
import { RsvpControlComponent } from '../../components/rsvp-control/rsvp-control.component';
import { EventsFacade } from '../../facade/events.facade';
import { formatProgrammeTime, formatWhen } from '../../models/event-format';
import { BringItemInput, KIND_LABELS, RECURRENCE_LABELS, RsvpAnswer } from '../../models/event.models';

@Component({
  selector: 'app-event-detail-page',
  standalone: true,
  imports: [
    RouterLink, AvatarComponent, IconComponent, PageLayoutComponent,
    AttendeeListComponent, BringListComponent, RsvpControlComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-detail-page.component.html',
  styleUrl: './event-detail-page.component.scss',
})
export class EventDetailPageComponent {
  protected readonly facade = inject(EventsFacade);

  /** From the route, via component input binding. */
  readonly eventId = input.required<string>();

  protected readonly event = computed(() => {
    const e = this.facade.selected();
    return e && e.id === this.eventId() ? e : null;
  });
  protected readonly when = computed(() => {
    const e = this.event();
    return e ? formatWhen(e.startsAt, e.endsAt, e.allDay) : '';
  });
  protected readonly kindLabel = computed(() => (this.event() ? KIND_LABELS[this.event()!.kind] : ''));
  protected readonly repeatLabel = computed(() => {
    const s = this.event()?.series;
    return s ? RECURRENCE_LABELS[s.recurrence.frequency] : '';
  });
  protected readonly time = formatProgrammeTime;

  constructor() {
    effect(() => this.facade.openEvent(this.eventId()));
  }

  protected can(action: string): boolean {
    return this.event()?.allowedActions.includes(action as never) ?? false;
  }

  protected answer(status: RsvpAnswer): void {
    this.facade.setRsvp(this.eventId(), status);
  }

  protected claim(itemId: string): void { this.facade.claimItem(this.eventId(), itemId); }
  protected unclaim(itemId: string): void { this.facade.unclaimItem(this.eventId(), itemId); }
  protected remove(itemId: string): void { this.facade.removeBringItem(this.eventId(), itemId); }
  protected add(item: BringItemInput): void { this.facade.addBringItem(this.eventId(), item); }

  protected cancelEvent(): void {
    // A styled confirm dialog can replace this once there is a shared dialog component.
    if (window.confirm(`Cancel "${this.event()?.title}" for everyone?`)) this.facade.cancelEvent(this.eventId());
  }
}
