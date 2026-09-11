import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import {
  KlijentOut,
  RadnikOut,
  RezervacijaOut,
  StatusRezervacije,
  UslugaOut,
} from '../../core/models/api.models';
import { nazivUsluge } from '../../core/models/katalog';
import { ObavijestiService } from '../../core/services/obavijesti.service';
import { SalonApiService } from '../../core/services/salon-api.service';
import { porukaGreske } from '../../core/util/greska';
import { izIsoBezZone, opisDatuma, uSatMinuta } from '../../core/util/vrijeme';
import { UcitavanjeComponent } from '../../shared/ucitavanje.component';

interface Redak {
  rezervacija: RezervacijaOut;
  usluga: string;
  radnik: string;
  klijent: string;
  datum: string;
  vrijeme: string;
}

const OPIS_STATUSA: Record<StatusRezervacije, string> = {
  NEPOTVRDJENA: 'Čeka potvrdu',
  AKTIVNA: 'Potvrđena',
  OTKAZANA: 'Otkazana',
};

@Component({
  selector: 'app-admin-rezervacije',
  imports: [UcitavanjeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rezervacije.component.html',
})
export class AdminRezervacijeComponent {
  private readonly api = inject(SalonApiService);
  private readonly obavijesti = inject(ObavijestiService);

  protected readonly OPIS_STATUSA = OPIS_STATUSA;
  protected readonly STATUSI: StatusRezervacije[] = ['NEPOTVRDJENA', 'AKTIVNA', 'OTKAZANA'];

  protected readonly ucitavanje = signal(true);
  protected readonly obrada = signal<number | null>(null);

  protected readonly radnici = signal<RadnikOut[]>([]);
  protected readonly klijenti = signal<KlijentOut[]>([]);
  private readonly usluge = signal<UslugaOut[]>([]);
  private readonly rezervacije = signal<RezervacijaOut[]>([]);

  protected readonly filtarRadnik = signal<number | null>(null);
  protected readonly filtarKlijent = signal<number | null>(null);
  protected readonly filtarStatus = signal<StatusRezervacije | null>(null);
  protected readonly filtarDatum = signal<string>('');

  protected readonly redci = computed<Redak[]>(() => {
    const usluge = new Map(this.usluge().map((u) => [u.usluga_id, u]));
    const radnici = new Map(this.radnici().map((r) => [r.korisnik_id, r]));
    const klijenti = new Map(this.klijenti().map((k) => [k.korisnik_id, k]));

    return this.rezervacije().map((rezervacija) => {
      const pocetak = izIsoBezZone(rezervacija.pocetak);
      const radnik = radnici.get(rezervacija.radnik_id);
      const klijent = klijenti.get(rezervacija.klijent_id);
      return {
        rezervacija,
        usluga: nazivUsluge(usluge.get(rezervacija.usluga_id)),
        radnik: radnik ? `${radnik.ime} ${radnik.prezime}` : `#${rezervacija.radnik_id}`,
        klijent: klijent ? `${klijent.ime} ${klijent.prezime}` : `#${rezervacija.klijent_id}`,
        datum: opisDatuma(pocetak),
        vrijeme: `${uSatMinuta(pocetak)} – ${uSatMinuta(izIsoBezZone(rezervacija.kraj))}`,
      };
    });
  });

  constructor() {
    this.ucitajSifrarnike();
  }

  private ucitajSifrarnike(): void {
    this.ucitavanje.set(true);
    forkJoin({
      radnici: this.api.radnici(),
      klijenti: this.api.klijenti(),
      usluge: this.api.usluge(),
    }).subscribe({
      next: ({ radnici, klijenti, usluge }) => {
        this.radnici.set(radnici);
        this.klijenti.set(klijenti);
        this.usluge.set(usluge);
        this.ucitajRezervacije();
      },
      error: (greska) => {
        this.ucitavanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Šifrarnike nije moguće učitati.'));
      },
    });
  }

  protected ucitajRezervacije(): void {
    this.ucitavanje.set(true);
    const datum = this.filtarDatum();
    this.api
      .rezervacije({
        radnikId: this.filtarRadnik() ?? undefined,
        klijentId: this.filtarKlijent() ?? undefined,
        status: this.filtarStatus() ?? undefined,
        datum: datum ? izIsoBezZone(`${datum}T00:00:00`) : undefined,
      })
      .subscribe({
        next: (rezervacije) => {
          this.rezervacije.set(rezervacije);
          this.ucitavanje.set(false);
        },
        error: (greska) => {
          this.ucitavanje.set(false);
          this.obavijesti.greska(porukaGreske(greska, 'Rezervacije nije moguće učitati.'));
        },
      });
  }

  protected postaviRadnika(vrijednost: string): void {
    this.filtarRadnik.set(vrijednost ? Number(vrijednost) : null);
    this.ucitajRezervacije();
  }

  protected postaviKlijenta(vrijednost: string): void {
    this.filtarKlijent.set(vrijednost ? Number(vrijednost) : null);
    this.ucitajRezervacije();
  }

  protected postaviStatus(vrijednost: string): void {
    this.filtarStatus.set(vrijednost ? (vrijednost as StatusRezervacije) : null);
    this.ucitajRezervacije();
  }

  protected postaviDatum(vrijednost: string): void {
    this.filtarDatum.set(vrijednost);
    this.ucitajRezervacije();
  }

  protected ocistiFiltre(): void {
    this.filtarRadnik.set(null);
    this.filtarKlijent.set(null);
    this.filtarStatus.set(null);
    this.filtarDatum.set('');
    this.ucitajRezervacije();
  }

  protected otkazi(rezervacijaId: number): void {
    this.obrada.set(rezervacijaId);
    this.api.otkaziRezervaciju(rezervacijaId).subscribe({
      next: (azurirana) => {
        this.obrada.set(null);
        this.rezervacije.update((popis) =>
          popis.map((r) => (r.rezervacija_id === rezervacijaId ? azurirana : r)),
        );
        this.obavijesti.uspjeh('Rezervacija je otkazana.');
      },
      error: (greska) => {
        this.obrada.set(null);
        this.obavijesti.greska(porukaGreske(greska, 'Otkazivanje nije uspjelo.'));
      },
    });
  }
}
