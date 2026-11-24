import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SECTIONS, sortedSections } from '@core/sections/section-definition';
import { IconComponent } from '@shared/components/icon/icon.component';

/**
 * App shell: a quiet side menu on wide screens and a bottom bar on phones.
 * The menu is built from the SECTIONS the application root provides.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  protected readonly sections = sortedSections(inject(SECTIONS));
}
