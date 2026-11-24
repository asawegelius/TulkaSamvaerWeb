import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { formatWhen } from '../../models/event-format';
import { EventSummary, KIND_LABELS, RECURRENCE_LABELS, RsvpAnswer } from '../../models/event.models';
import { RsvpControlComponent } from '../rsvp-control/rsvp-control.component';

/** A small event card for the list: what, when, who for, and your answer. */
@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink, IconComponent, RsvpControlComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let e = event();
    <article class="sv-card card">
      <div class="top">
        <span class="sv-tag sv-tag--event">{{ kindLabel() }}</span>
        @if (e.series) {
          <span class="sv-meta rep"><sv-icon name="repeat" [size]="14" />{{ repeatLabel() }}</span>
        }
      </div>
      <h2><a [routerLink]="['/events', e.id]">{{ e.title }}</a></h2>
      <p class="sv-meta">{{ when() }}@if (e.location) { · {{ e.location }} } · {{ e.audienceLabel }}</p>
      @if (e.allowedActions.includes('rsvp')) {
        <app-rsvp-control [status]="e.myRsvp" [eventTitle]="e.title" [disabled]="busy()" (answer)="answer.emit($event)" />
      }
      @if (e.allowedActions.includes('rsvp')) {
        <p class="sv-meta counts">
          {{ e.rsvpSummary.going }} going@if (e.rsvpSummary.maybe) { · {{ e.rsvpSummary.maybe }} maybe }
          @if (e.bringList.total) { · {{ e.bringList.taken }} of {{ e.bringList.total }} things taken }
        </p>
      }
    </article>
  `,
  styles: `
    .card { display: flex; flex-direction: column; gap: 8px; height: 100%; }
    .top { display: flex; align-items: center; gap: 10px; }
    .rep { display: inline-flex; align-items: center; gap: 4px; }
    h2 { margin: 2px 0 0; font-size: 20px; }
    h2 a { text-decoration: none; }
    h2 a:hover { text-decoration: underline; }
    h2 a::after { content: ''; position: absolute; inset: 0; }
    .card { position: relative; }
    app-rsvp-control { position: relative; z-index: 1; }
    p { margin: 0; }
    .counts { margin-top: auto; }
  `,
})
export class EventCardComponent {
  readonly event = input.required<EventSummary>();
  readonly busy = input(false);
  readonly answer = output<RsvpAnswer>();

  protected readonly when = computed(() => formatWhen(this.event().startsAt, this.event().endsAt, this.event().allDay));
  protected readonly kindLabel = computed(() => KIND_LABELS[this.event().kind]);
  protected readonly repeatLabel = computed(() => {
    const series = this.event().series;
    return series ? RECURRENCE_LABELS[series.recurrence.frequency] : '';
  });
}
