import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** What an avatar needs. Matches the API's MemberRef without depending on it. */
export interface AvatarPerson {
  id: string;
  displayName: string;
  initials: string;
}

// Calm colours from the house, chosen per person so the same person keeps one colour.
const COLOURS = ['#34483b', '#4a7a38', '#b3332b', '#2b2b2b', '#6f5a3a', '#3d5a6b'];

@Component({
  selector: 'sv-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="av" [style.background]="colour()" [style.width.px]="size()" [style.height.px]="size()"
    [attr.title]="person().displayName">{{ person().initials }}</span>`,
  styles: `
    :host { display: inline-flex; }
    .av { border-radius: 50%; display: grid; place-items: center; color: #fff;
      font: 600 12px var(--sv-font); border: 2px solid var(--sv-surface); }
  `,
})
export class AvatarComponent {
  readonly person = input.required<AvatarPerson>();
  readonly size = input(28);
  protected readonly colour = computed(() => {
    const id = this.person().id;
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return COLOURS[hash % COLOURS.length];
  });
}
