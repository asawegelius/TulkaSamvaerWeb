import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Group, MemberRef } from '@core/platform/platform-api.service';
import { FormLayoutComponent } from '@shared/layouts/form-layout/form-layout.component';
import { VisibilityPickerComponent, VisibilityValue } from '@shared/components/visibility-picker/visibility-picker.component';
import { TimeZoneService } from '@core/time/time-zone.service';
import { addDays, fromWallTime, toWallTime } from '@core/time/zoned-time';
import {
  EventDetail, EventInput, EventKind, KIND_LABELS, RECURRENCE_LABELS, Recurrence,
} from '../../models/event.models';

type Frequency = Recurrence['frequency'] | '';

type ProgrammeRow = FormGroup<{ date: FormControl<string>; time: FormControl<string>; title: FormControl<string> }>;
type SleepingRow = FormGroup<{ place: FormControl<string>; guestIds: FormControl<string[]>; note: FormControl<string> }>;
type BringRow = FormGroup<{ title: FormControl<string>; details: FormControl<string>; slots: FormControl<number | null> }>;

const programmeRow = (fb: NonNullableFormBuilder, date = '', time = '', title = ''): ProgrammeRow =>
  fb.group({ date: fb.control(date), time: fb.control(time), title: fb.control(title) });
const sleepingRow = (fb: NonNullableFormBuilder, place = '', guestIds: string[] = [], note = ''): SleepingRow =>
  fb.group({ place: fb.control(place), guestIds: fb.control<string[]>(guestIds), note: fb.control(note) });
const bringRow = (fb: NonNullableFormBuilder, title = '', details = '', slots: number | null = 1): BringRow =>
  fb.group({ title: fb.control(title), details: fb.control(details), slots: fb.control<number | null>(slots) });

/** The values the form sends. The page decides whether it is a create or an update. */
export type EventFormValue = EventInput;

/**
 * Create and edit form for an event. It collects input and shows the backend's
 * field errors; the backend does the real validation.
 */
@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormLayoutComponent, VisibilityPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss',
})
export class EventFormComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly viewerZone = inject(TimeZoneService).timeZone;

  /** The event being edited, or null for a new one. */
  readonly event = input<EventDetail | null>(null);
  readonly groups = input<Group[]>([]);
  readonly members = input<MemberRef[]>([]);
  readonly saving = input(false);
  readonly fieldErrors = input<{ field: string; message: string }[]>([]);

  readonly save = output<EventFormValue>();
  readonly cancel = output<void>();

  protected readonly kinds = Object.entries(KIND_LABELS) as [EventKind, string][];
  protected readonly frequencies = Object.entries(RECURRENCE_LABELS) as [Recurrence['frequency'], string][];
  protected readonly isEdit = computed(() => this.event() !== null);
  /** Every IANA zone the browser knows, for the time zone picker. */
  protected readonly zones = Intl.supportedValuesOf('timeZone');

  protected readonly form = this.fb.group({
    kind: this.fb.control<EventKind>('GATHERING'),
    title: this.fb.control('', [Validators.required, Validators.maxLength(120)]),
    startDate: this.fb.control('', Validators.required),
    startTime: this.fb.control('18:00'),
    endDate: this.fb.control('', Validators.required),
    endTime: this.fb.control('22:00'),
    allDay: this.fb.control(false),
    // New events are planned in the viewer's zone; edits keep the event's zone.
    timeZone: this.fb.control(this.viewerZone()),
    location: this.fb.control(''),
    description: this.fb.control(''),
    frequency: this.fb.control<Frequency>(''),
    visibility: this.fb.control<VisibilityValue>({ scope: 'GROUPS', groupIds: [] }),
    programme: this.fb.array<ProgrammeRow>([]),
    sleeping: this.fb.array<SleepingRow>([]),
    bringItems: this.fb.array<BringRow>([]),
  });

  constructor() {
    effect(() => {
      const event = this.event();
      if (event) this.fill(event);
    });
  }

  protected get programme(): FormArray<ProgrammeRow> { return this.form.controls.programme; }
  protected get sleeping(): FormArray<SleepingRow> { return this.form.controls.sleeping; }
  protected get bringItems(): FormArray<BringRow> { return this.form.controls.bringItems; }

  protected errorFor(field: string): string | null {
    return this.fieldErrors().find((e) => e.field === field || e.field.startsWith(`${field}.`))?.message ?? null;
  }

  protected addProgramme(): void { this.form.controls.programme.push(programmeRow(this.fb, this.form.controls.startDate.value)); }
  protected addSleeping(): void { this.form.controls.sleeping.push(sleepingRow(this.fb)); }
  protected addBring(): void { this.form.controls.bringItems.push(bringRow(this.fb)); }

  protected toggleGuest(rowIndex: number, memberId: string): void {
    const control = this.form.controls.sleeping.at(rowIndex).controls.guestIds;
    const ids = control.value;
    control.setValue(ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId]);
  }

  protected onStartDateChange(): void {
    const { startDate, endDate } = this.form.controls;
    if (!endDate.value || endDate.value < startDate.value) endDate.setValue(startDate.value);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const zone = v.timeZone;
    // All-day: midnight to midnight after the last day, in the event's zone (exclusive end).
    const startsAt = fromWallTime(v.startDate, v.allDay ? '00:00' : v.startTime, zone);
    const endsAt = v.allDay ? fromWallTime(addDays(v.endDate, 1), '00:00', zone) : fromWallTime(v.endDate, v.endTime, zone);
    this.save.emit({
      kind: v.kind,
      title: v.title.trim(),
      description: v.description.trim() || null,
      startsAt,
      endsAt,
      allDay: v.allDay,
      timeZone: zone,
      location: v.location.trim() || null,
      visibility: v.visibility,
      programme: v.programme
        .filter((p) => p.title.trim() && p.date)
        .map((p) => ({ startsAt: fromWallTime(p.date, p.time, zone), title: p.title.trim() })),
      sleeping: v.sleeping
        .filter((s) => s.place.trim())
        .map((s) => ({ place: s.place.trim(), guestIds: s.guestIds, note: s.note.trim() || null })),
      recurrence: v.frequency ? { frequency: v.frequency, interval: 1, until: null } : null,
      bringItems: v.bringItems
        .filter((b) => b.title.trim())
        .map((b) => ({ title: b.title.trim(), details: b.details.trim() || null, slots: b.slots })),
    });
  }

  private fill(event: EventDetail): void {
    const zone = event.timeZone;
    const start = toWallTime(event.startsAt, zone);
    const end = toWallTime(event.endsAt, zone);
    this.form.patchValue({
      kind: event.kind,
      title: event.title,
      startDate: start.date,
      startTime: start.time,
      endDate: event.allDay ? addDays(end.date, -1) : end.date,
      endTime: end.time,
      allDay: event.allDay,
      timeZone: zone,
      location: event.location ?? '',
      description: event.description ?? '',
      frequency: event.series?.recurrence.frequency ?? '',
      visibility: event.visibility,
    });
    const programme = this.form.controls.programme;
    programme.clear();
    event.programme.forEach((p) => {
      const at = toWallTime(p.startsAt, zone);
      programme.push(programmeRow(this.fb, at.date, at.time, p.title));
    });
    const sleeping = this.form.controls.sleeping;
    sleeping.clear();
    event.sleeping.forEach((s) => sleeping.push(sleepingRow(this.fb, s.place, s.guests.map((g) => g.id), s.note ?? '')));
    this.form.controls.frequency.disable();
  }
}
