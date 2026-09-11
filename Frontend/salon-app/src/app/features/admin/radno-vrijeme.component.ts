import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RadnikOut, RadnoVrijemeOut } from '../../core/models/api.models';
import { ObavijestiService } from '../../core/services/obavijesti.service';
import { SalonApiService } from '../../core/services/salon-api.service';
import { porukaGreske } from '../../core/util/greska';
import { PUNI_DANI, uSatMinuta } from '../../core/util/vrijeme';
import { UcitavanjeComponent } from '../../shared/ucitavanje.component';

interface DanRedak {
  dan: number;
  naziv: string;
  intervali: RadnoVrijemeOut[];
}

/** ISO redoslijed dana: 1 = ponedjeljak … 7 = nedjelja. */
const DANI = [1, 2, 3, 4, 5, 6, 7];

@Component({
  selector: 'app-admin-radno-vrijeme',
  imports: [FormsModule, UcitavanjeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './radno-vrijeme.component.html',
})
export class AdminRadnoVrijemeComponent {
  private readonly api = inject(SalonApiService);
  private readonly obavijesti = inject(ObavijestiService);

  protected readonly uSatMinuta = uSatMinuta;

  protected readonly ucitavanje = signal(true);
  protected readonly spremanje = signal(false);
  protected readonly radnici = signal<RadnikOut[]>([]);
  protected readonly odabraniRadnikId = signal<number | null>(null);
  private readonly intervali = signal<RadnoVrijemeOut[]>([]);

  /** Vrijednosti polja za dodavanje novog intervala, po danu. */
  protected readonly noviOd = signal<Record<number, string | undefined>>({});
  protected readonly noviDo = signal<Record<number, string | undefined>>({});

  protected readonly redci = computed<DanRedak[]>(() =>
    DANI.map((dan) => ({
      dan,
      naziv: PUNI_DANI[dan === 7 ? 0 : dan],
      intervali: this.intervali()
        .filter((i) => i.dan_u_tjednu === dan)
        .sort((a, b) => a.vrijeme_od.localeCompare(b.vrijeme_od)),
    })),
  );

  constructor() {
    this.ucitajRadnike();
  }

  private ucitajRadnike(): void {
    this.ucitavanje.set(true);
    this.api.radnici().subscribe({
      next: (radnici) => {
        this.radnici.set(radnici);
        this.ucitavanje.set(false);
        if (radnici.length > 0) {
          this.odaberiRadnika(radnici[0].korisnik_id);
        }
      },
      error: (greska) => {
        this.ucitavanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Radnike nije moguće učitati.'));
      },
    });
  }

  protected odaberiRadnika(radnikId: number): void {
    this.odabraniRadnikId.set(radnikId);
    this.ucitajIntervale();
  }

  protected promijeniRadnika(vrijednost: string): void {
    this.odaberiRadnika(Number(vrijednost));
  }

  private ucitajIntervale(): void {
    const radnikId = this.odabraniRadnikId();
    if (radnikId === null) {
      return;
    }
    this.ucitavanje.set(true);
    this.api.radnoVrijeme(radnikId).subscribe({
      next: (intervali) => {
        this.intervali.set(intervali);
        this.ucitavanje.set(false);
      },
      error: (greska) => {
        this.ucitavanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Radno vrijeme nije moguće učitati.'));
      },
    });
  }

  protected postaviOd(dan: number, vrijednost: string): void {
    this.noviOd.update((mapa) => ({ ...mapa, [dan]: vrijednost }));
  }

  protected postaviDo(dan: number, vrijednost: string): void {
    this.noviDo.update((mapa) => ({ ...mapa, [dan]: vrijednost }));
  }

  protected dodaj(dan: number): void {
    const radnikId = this.odabraniRadnikId();
    const od = this.noviOd()[dan];
    const doKad = this.noviDo()[dan];

    if (radnikId === null || !od || !doKad) {
      this.obavijesti.greska('Unesite vrijeme od i do.');
      return;
    }
    if (od >= doKad) {
      this.obavijesti.greska('Vrijeme „od” mora biti prije vremena „do”.');
      return;
    }

    this.spremanje.set(true);
    this.api
      .dodajRadnoVrijeme(radnikId, {
        dan_u_tjednu: dan,
        vrijeme_od: `${od}:00`,
        vrijeme_do: `${doKad}:00`,
      })
      .subscribe({
        next: (interval) => {
          this.spremanje.set(false);
          this.intervali.update((popis) => [...popis, interval]);
          this.noviOd.update((mapa) => ({ ...mapa, [dan]: '' }));
          this.noviDo.update((mapa) => ({ ...mapa, [dan]: '' }));
          this.obavijesti.uspjeh('Radno vrijeme je dodano.');
        },
        error: (greska) => {
          this.spremanje.set(false);
          this.obavijesti.greska(porukaGreske(greska, 'Interval nije moguće dodati.'));
        },
      });
  }

  protected obrisi(interval: RadnoVrijemeOut): void {
    const radnikId = this.odabraniRadnikId();
    if (radnikId === null || this.spremanje()) {
      return;
    }

    this.spremanje.set(true);
    this.api.obrisiRadnoVrijeme(radnikId, interval.radno_vrijeme_id).subscribe({
      next: () => {
        this.spremanje.set(false);
        this.intervali.update((popis) =>
          popis.filter((i) => i.radno_vrijeme_id !== interval.radno_vrijeme_id),
        );
      },
      error: (greska) => {
        this.spremanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Interval nije moguće obrisati.'));
      },
    });
  }
}
