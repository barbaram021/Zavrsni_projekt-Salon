import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ZaglavljeComponent } from '../../shared/zaglavlje.component';
import { AdminRadnoVrijemeComponent } from './radno-vrijeme.component';
import { AdminRezervacijeComponent } from './rezervacije.component';
import { AdminUslugeComponent } from './usluge.component';
import { AdminZaposleniciComponent } from './zaposlenici.component';

type Kartica = 'zaposlenici' | 'radno' | 'usluge' | 'rezervacije';

@Component({
  selector: 'app-admin',
  imports: [
    ZaglavljeComponent,
    AdminZaposleniciComponent,
    AdminRadnoVrijemeComponent,
    AdminUslugeComponent,
    AdminRezervacijeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen justify-center bg-krem px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div
        class="min-h-[80vh] w-full max-w-7xl overflow-hidden rounded-3xl bg-bijela-topla shadow-panel"
      >
        <app-zaglavlje>
          <span class="font-naslov text-[22px] font-semibold text-white italic"
            >Gabi&amp;Barbi · Admin</span
          >
        </app-zaglavlje>

        <div class="px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
          <div class="mb-6 flex w-fit max-w-full gap-2 overflow-x-auto rounded-2xl bg-krem p-1">
            @for (mogucnost of KARTICE; track mogucnost.kljuc) {
              <button
                type="button"
                class="shrink-0 cursor-pointer rounded-[10px] border-none px-4.5 py-2.5 text-[13px] font-medium"
                [class]="
                  kartica() === mogucnost.kljuc
                    ? 'bg-ruza-tamna text-white'
                    : 'bg-transparent text-sljiva hover:bg-white/60'
                "
                (click)="kartica.set(mogucnost.kljuc)"
              >
                {{ mogucnost.naziv }}
              </button>
            }
          </div>

          @switch (kartica()) {
            @case ('zaposlenici') {
              <app-admin-zaposlenici />
            }
            @case ('radno') {
              <app-admin-radno-vrijeme />
            }
            @case ('usluge') {
              <app-admin-usluge />
            }
            @case ('rezervacije') {
              <app-admin-rezervacije />
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminComponent {
  protected readonly KARTICE: { kljuc: Kartica; naziv: string }[] = [
    { kljuc: 'zaposlenici', naziv: 'Zaposlenici' },
    { kljuc: 'radno', naziv: 'Radno vrijeme' },
    { kljuc: 'usluge', naziv: 'Usluge' },
    { kljuc: 'rezervacije', naziv: 'Rezervacije' },
  ];

  protected readonly kartica = signal<Kartica>('zaposlenici');
}
