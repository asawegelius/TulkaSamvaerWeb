import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { BringItem, BringItemInput } from '../../models/event.models';

/**
 * "Who brings what". Open slots stay visible until someone takes them.
 * Buttons come from each item's allowedActions, so the backend decides who may do what.
 */
@Component({
  selector: 'app-bring-list',
  standalone: true,
  imports: [FormsModule, AvatarComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bring-list.component.html',
  styleUrl: './bring-list.component.scss',
})
export class BringListComponent {
  readonly items = input.required<BringItem[]>();
  readonly canAdd = input(false);
  /** Key of the change waiting for the API, for example `item:<id>` or `add-item`. */
  readonly pending = input<string | null>(null);

  readonly claim = output<string>();
  readonly unclaim = output<string>();
  readonly remove = output<string>();
  readonly add = output<BringItemInput>();

  protected readonly taken = computed(() => this.items().filter((i) => i.claimedBy.length > 0).length);
  protected readonly adding = signal(false);
  protected draft = { title: '', details: '', slots: 1 as number | null };

  protected busy(itemId: string): boolean {
    return this.pending() === `item:${itemId}`;
  }

  protected slotText(item: BringItem): string {
    if (item.slots === null) return 'Everyone';
    const open = item.slots - item.claimedBy.length;
    return item.slots > 1 && open > 0 ? `${open} of ${item.slots} open` : '';
  }

  protected submit(): void {
    const title = this.draft.title.trim();
    if (!title) return;
    this.add.emit({ title, details: this.draft.details.trim() || null, slots: this.draft.slots });
    this.draft = { title: '', details: '', slots: 1 };
    this.adding.set(false);
  }
}
