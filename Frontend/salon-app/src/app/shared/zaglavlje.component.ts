import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthService } from '../core/services/auth.service';

/** Ružičasta traka s gradijentom iz dizajna; lijevi dio se projicira iz roditelja. */
@Component({
  selector: 'app-zaglavlje',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gradijent-ruza flex items-center justify-between gap-4 px-6 py-5 sm:px-7">
      <ng-content />
      <button
        type="button"
        class="shrink-0 cursor-pointer rounded-full border-none bg-white/20 px-3.5 py-[7px] text-xs text-white hover:bg-white/30"
        (click)="auth.odjava()"
      >
        Odjava
      </button>
    </div>
  `,
})
export class ZaglavljeComponent {
  protected readonly auth = inject(AuthService);
}
