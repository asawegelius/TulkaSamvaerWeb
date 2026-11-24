import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { VisibilityPickerComponent, VisibilityValue } from './visibility-picker.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, VisibilityPickerComponent],
  template: `<sv-visibility-picker [formControl]="control" [groups]="groups" />`,
})
class HostComponent {
  control = new FormControl<VisibilityValue>({ scope: 'GROUPS', groupIds: [] }, { nonNullable: true });
  groups = [
    { id: 'g1', name: 'Family', memberCount: 5 },
    { id: 'g2', name: 'Best friends', memberCount: 7 },
  ];
}

describe('VisibilityPickerComponent', () => {
  it('toggles groups and clears them when another scope is chosen', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    const family = Array.from(el.querySelectorAll<HTMLButtonElement>('.sv-chip')).find((b) => b.textContent?.includes('Family'))!;
    family.click();
    expect(fixture.componentInstance.control.value).toEqual({ scope: 'GROUPS', groupIds: ['g1'] });

    const radios = el.querySelectorAll<HTMLInputElement>('input[type=radio]');
    radios[2].click();
    expect(fixture.componentInstance.control.value).toEqual({ scope: 'ALL_MEMBERS', groupIds: [] });

    fixture.detectChanges();
    expect(el.querySelectorAll('.sv-chip').length).toBe(0);
  });
});
