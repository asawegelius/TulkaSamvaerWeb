import { TestBed } from '@angular/core/testing';
import { RsvpControlComponent } from './rsvp-control.component';

describe('RsvpControlComponent', () => {
  it('marks the current answer and emits a new one', () => {
    const fixture = TestBed.createComponent(RsvpControlComponent);
    fixture.componentRef.setInput('status', 'MAYBE');
    fixture.detectChanges();
    const buttons = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'));

    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Going', 'Maybe', "Can't"]);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');

    const answers: string[] = [];
    fixture.componentInstance.answer.subscribe((a) => answers.push(a));
    buttons[0].click();
    expect(answers).toEqual(['GOING']);
  });
});
