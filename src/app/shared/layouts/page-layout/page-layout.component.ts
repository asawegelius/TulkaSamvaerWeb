import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Outer frame for every page: title, actions and content.
 *
 * Slots: `[slot=back]`, `[slot=eyebrow]`, `[slot=actions]`, `[slot=meta]`, and the default slot for content.
 */
@Component({
  selector: 'sv-page-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <ng-content select="[slot=back]" />
      <header class="head">
        <div class="title">
          <ng-content select="[slot=eyebrow]" />
          <h1>{{ heading() }}</h1>
          <ng-content select="[slot=meta]" />
        </div>
        <div class="actions"><ng-content select="[slot=actions]" /></div>
      </header>
      <ng-content />
    </div>
  `,
  styles: `
    .page { max-width: 1080px; margin: 0 auto; padding: clamp(16px, 3vw, 32px); }
    .head { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: flex-end;
      justify-content: space-between; margin-bottom: 20px; }
    .title { display: flex; flex-direction: column; gap: 4px; }
    .title h1 { margin: 4px 0 0; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
  `,
})
export class PageLayoutComponent {
  readonly heading = input.required<string>();
}
