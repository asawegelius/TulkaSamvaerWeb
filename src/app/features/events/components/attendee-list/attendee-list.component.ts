import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { Attendee, RsvpStatus } from '../../models/event.models';

const GROUPS: { status: RsvpStatus; label: string }[] = [
  { status: 'GOING', label: 'Going' },
  { status: 'MAYBE', label: 'Maybe' },
  { status: 'PENDING', label: 'Not answered yet' },
  { status: 'CANT', label: "Can't" },
];

/** Who is coming, grouped by answer. Names only, no counters to chase. */
@Component({
  selector: 'app-attendee-list',
  standalone: true,
  imports: [AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (group of grouped(); track group.status) {
      <div class="grp">
        <h3 class="sv-meta">{{ group.label }}</h3>
        <ul class="ppl">
          @for (a of group.people; track a.member.id) {
            <li [class.dim]="group.status !== 'GOING'">
              <sv-avatar [person]="a.member" [size]="24" />{{ a.member.displayName }}
              @if (a.note) { <span class="sv-meta">· {{ a.note }}</span> }
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    .grp + .grp { margin-top: 10px; }
    h3 { font-size: 13px; font-weight: 600; margin: 0 0 6px; }
    .ppl { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
    li { display: inline-flex; align-items: center; gap: 6px; padding: 2px 12px 2px 2px; border-radius: 999px;
      background: var(--sv-sunken); border: 1px solid var(--sv-line); font-size: 14px; }
    li.dim { opacity: 0.75; }
  `,
})
export class AttendeeListComponent {
  readonly attendees = input.required<Attendee[]>();
  protected readonly grouped = computed(() =>
    GROUPS.map((g) => ({ ...g, people: this.attendees().filter((a) => a.status === g.status) })).filter((g) => g.people.length > 0),
  );
}
