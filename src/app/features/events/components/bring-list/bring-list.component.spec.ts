import { TestBed } from '@angular/core/testing';
import { BringListComponent } from './bring-list.component';
import { SOFIE, bringItemFixture } from '../../testing/event.fixtures';

describe('BringListComponent', () => {
  function render(items = [bringItemFixture()], canAdd = false) {
    const fixture = TestBed.createComponent(BringListComponent);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('canAdd', canAdd);
    fixture.detectChanges();
    return fixture;
  }

  it('shows only the buttons the API allows', () => {
    const fixture = render([
      bringItemFixture({ id: 'open', allowedActions: ['claim'] }),
      bringItemFixture({ id: 'mine', title: 'Snacks', claimedBy: [{ member: SOFIE, note: 'chili' }], allowedActions: ['unclaim', 'remove'] }),
      bringItemFixture({ id: 'taken', title: 'Breakfast', claimedBy: [{ member: SOFIE, note: null }], allowedActions: [] }),
    ]);
    const rows = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('li.item'));
    const buttons = (row: HTMLElement) => Array.from(row.querySelectorAll('button')).map((b) => b.textContent?.trim() || b.getAttribute('aria-label'));

    expect(buttons(rows[0])).toEqual(["I'll take it"]);
    expect(buttons(rows[1])).toEqual(['Give it back', 'Remove Snacks']);
    expect(buttons(rows[2])).toEqual([]);
    expect(rows[1].textContent).toContain('Sofie: chili');
    expect(fixture.nativeElement.textContent).toContain('2 of 3 taken');
  });

  it('emits claim with the item id', () => {
    const fixture = render();
    const claims: string[] = [];
    fixture.componentInstance.claim.subscribe((id) => claims.push(id));
    fixture.nativeElement.querySelector('li.item button').click();
    expect(claims).toEqual(['i-1']);
  });

  it('adds an item from the inline form', async () => {
    const fixture = render([], true);
    const added: unknown[] = [];
    fixture.componentInstance.add.subscribe((item) => added.push(item));
    fixture.nativeElement.querySelector('.add-btn').click();
    fixture.detectChanges();
    await fixture.whenStable();

    const title: HTMLInputElement = fixture.nativeElement.querySelector('#bring-title');
    title.value = 'Dessert';
    title.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(added).toEqual([{ title: 'Dessert', details: null, slots: 1 }]);
  });
});
