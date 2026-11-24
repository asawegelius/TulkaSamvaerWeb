import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Line icons at 1.6px with round ends, per the style guide. */
const PATHS: Record<string, string> = {
  calendar: 'M4 6.5h16M8 3v4M16 3v4M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z',
  event: 'M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5ZM4 9.5h16M8 3v4M16 3v4M9 14.5l2 2 4-4',
  recipe: 'M6 3v8a2 2 0 0 0 4 0V3M8 11v10M16 3c-2 2-2 6 0 8v10',
  garden: 'M12 21v-9M12 12c0-4 3-7 7-7 0 4-3 7-7 7ZM12 14c0-3-2.5-5.5-6-5.5 0 3.5 2.5 5.5 6 5.5Z',
  chat: 'M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  booking: 'M4 20V9l8-5 8 5v11M9 20v-6h6v6',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 5l-7 7 7 7',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  repeat: 'M4 12a7 7 0 0 1 12-5l2 2M18 4v5h-5M20 12a7 7 0 0 1-12 5l-2-2M6 20v-5h5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c1.8.8 3 2.6 3 4.5',
  bed: 'M3 19v-9M3 14h18v5M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  close: 'M6 6l12 12M18 6L6 18',
};

@Component({
  selector: 'sv-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;flex:none' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path [attr.d]="path()" />
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(20);
  protected readonly path = computed(() => PATHS[this.name()] ?? '');
}
