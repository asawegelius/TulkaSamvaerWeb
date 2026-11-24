import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RSVP_LABELS, RsvpAnswer, RsvpStatus } from '../../models/event.models';

/** Going / Maybe / Can't, as one row of round buttons. */
@Component({
  selector: 'app-rsvp-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rsvp" role="group" [attr.aria-label]="'Your answer for ' + eventTitle()">
      @for (option of options; track option) {
        <button type="button" [attr.aria-pressed]="status() === option" [disabled]="disabled()"
                (click)="answer.emit(option)">{{ labels[option] }}</button>
      }
    </div>
  `,
  styles: `
    .rsvp { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    button { min-height: 40px; padding: 0 6px; border-radius: 999px; border: 1px solid var(--sv-line);
      background: var(--sv-surface); color: var(--sv-ink); font: 14px var(--sv-font); cursor: pointer; }
    button[aria-pressed='true'] { background: var(--sv-primary); color: var(--sv-on-primary);
      border-color: transparent; font-weight: 600; }
    button:disabled { cursor: progress; opacity: 0.7; }
  `,
})
export class RsvpControlComponent {
  readonly status = input.required<RsvpStatus>();
  readonly eventTitle = input('this event');
  readonly disabled = input(false);
  readonly answer = output<RsvpAnswer>();

  protected readonly options: RsvpAnswer[] = ['GOING', 'MAYBE', 'CANT'];
  protected readonly labels = RSVP_LABELS;
}
