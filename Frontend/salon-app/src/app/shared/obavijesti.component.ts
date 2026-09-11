import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ObavijestiService } from '../core/services/obavijesti.service';

@Component({
  selector: 'app-obavijesti',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      @for (obavijest of obavijesti.obavijesti(); track obavijest.id) {
        <div
          class="animate-uzdizanje pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-kartica"
          [class]="stil(obavijest.vrsta)"
        >
          <span class="flex-1">{{ obavijest.poruka }}</span>
          <button
            type="button"
            class="cursor-pointer text-base leading-none opacity-60 hover:opacity-100"
            aria-label="Zatvori obavijest"
            (click)="obavijesti.zatvori(obavijest.id)"
          >
            &times;
          </button>
        </div>
      }
    </div>
  `,
})
export class ObavijestiComponent {
  protected readonly obavijesti = inject(ObavijestiService);

  protected stil(vrsta: string): string {
    switch (vrsta) {
      case 'uspjeh':
        return 'bg-white text-sljiva border border-rub-jaci';
      case 'greska':
        return 'bg-ruza-tamna text-white';
      default:
        return 'bg-white text-tekst border border-rub';
    }
  }
}
