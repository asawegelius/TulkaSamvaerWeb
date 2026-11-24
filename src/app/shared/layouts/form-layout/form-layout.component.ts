import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Frame for every create and edit form: stacked sections with sticky actions at the bottom.
 *
 * Slots: the default slot for `<section>`s, `[slot=actions]` for the buttons.
 */
@Component({
  selector: 'sv-form-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sections"><ng-content /></div>
    <div class="actions"><ng-content select="[slot=actions]" /></div>
  `,
  styles: `
    :host { display: block; max-width: 720px; }
    .sections { display: flex; flex-direction: column; gap: 16px; }
    .actions { position: sticky; bottom: 0; display: flex; gap: 8px; justify-content: flex-end;
      padding: 12px 0; margin-top: 16px; background: var(--sv-bg); border-top: 1px solid var(--sv-line); }
  `,
})
export class FormLayoutComponent {}
