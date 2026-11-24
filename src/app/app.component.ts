import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppShellComponent } from '@layout/app-shell/app-shell.component';

/**
 * The root component of the application.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppShellComponent],
  template: '<app-shell />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
