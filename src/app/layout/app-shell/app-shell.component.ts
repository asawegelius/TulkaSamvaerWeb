import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { sortedSections } from '@core/sections/sections';
import { IconComponent } from '@shared/components/icon/icon.component';

/**
 * App shell: a quiet side menu on wide screens and a bottom bar on phones.
 * The menu is built from the section registry.
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
  protected readonly sections = sortedSections();
}
