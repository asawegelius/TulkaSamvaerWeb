import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type VisibilityScope = 'ONLY_ME' | 'GROUPS' | 'ALL_MEMBERS';

/** Same shape as the API's Visibility. */
export interface VisibilityValue {
  scope: VisibilityScope;
  groupIds: string[];
}

export interface PickableGroup {
  id: string;
  name: string;
  memberCount: number;
}

interface ScopeOption {
  scope: VisibilityScope;
  title: string;
  hint: string;
}

const OPTIONS: ScopeOption[] = [
  { scope: 'ONLY_ME', title: 'Only me', hint: 'A private note, like a diary.' },
  { scope: 'GROUPS', title: 'Some of my groups', hint: 'Only the people in the groups you pick.' },
  { scope: 'ALL_MEMBERS', title: 'Public', hint: 'Every Samvær member, never anyone outside Samvær.' },
];

/**
 * "Who can see this?" The same picker is used in every create and edit form.
 * It only collects the choice. The backend decides who actually sees the item.
 */
@Component({
  selector: 'sv-visibility-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => VisibilityPickerComponent), multi: true }],
  template: `
    <fieldset class="vis" [disabled]="disabled()">
      <legend class="sv-label">Who can see this?</legend>
      @for (option of options; track option.scope) {
        <label class="opt" [class.on]="value().scope === option.scope">
          <input type="radio" name="sv-visibility" [value]="option.scope"
                 [checked]="value().scope === option.scope" (change)="selectScope(option.scope)" />
          <span><b>{{ option.title }}</b><small>{{ option.hint }}</small></span>
        </label>
        @if (option.scope === 'GROUPS' && value().scope === 'GROUPS') {
          <div class="chips" role="group" aria-label="Groups">
            @for (group of groups(); track group.id) {
              <button type="button" class="sv-chip" [attr.aria-pressed]="value().groupIds.includes(group.id)"
                      (click)="toggleGroup(group.id)">{{ group.name }} · {{ group.memberCount }}</button>
            } @empty {
              <span class="sv-meta">You are not in any groups yet.</span>
            }
          </div>
        }
      }
    </fieldset>
  `,
  styles: `
    .vis { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    legend { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .opt { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 10px; align-items: start;
      padding: 10px 12px; border: 1px solid var(--sv-line); border-radius: 12px; cursor: pointer; }
    .opt.on { border-color: var(--sv-primary); background: color-mix(in srgb, var(--sv-primary) 9%, var(--sv-surface)); }
    .opt input { accent-color: var(--sv-primary); width: 18px; height: 18px; margin: 3px 0 0; }
    .opt b { display: block; font-size: 15px; }
    .opt small { font-size: 13px; color: var(--sv-muted); }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0 6px 34px; }
  `,
})
export class VisibilityPickerComponent implements ControlValueAccessor {
  readonly groups = input<PickableGroup[]>([]);
  protected readonly options = OPTIONS;
  protected readonly value = signal<VisibilityValue>({ scope: 'GROUPS', groupIds: [] });
  protected readonly disabled = signal(false);

  private onChange: (value: VisibilityValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: VisibilityValue | null): void {
    this.value.set(value ?? { scope: 'GROUPS', groupIds: [] });
  }

  registerOnChange(fn: (value: VisibilityValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected selectScope(scope: VisibilityScope): void {
    this.update({ scope, groupIds: scope === 'GROUPS' ? this.value().groupIds : [] });
  }

  protected toggleGroup(groupId: string): void {
    const ids = this.value().groupIds;
    this.update({
      scope: 'GROUPS',
      groupIds: ids.includes(groupId) ? ids.filter((id) => id !== groupId) : [...ids, groupId],
    });
  }

  private update(value: VisibilityValue): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }
}
