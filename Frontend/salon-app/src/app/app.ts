import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ObavijestiComponent } from './shared/obavijesti.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ObavijestiComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-obavijesti />
    <router-outlet />
  `,
})
export class App {}
