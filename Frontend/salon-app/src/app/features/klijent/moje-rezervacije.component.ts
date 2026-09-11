import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
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
import { ZaglavljeComponent } from '../../shared/zaglavlje.component';

interface RedakRezervacije {
  rezervacija: RezervacijaOut;
  usluga: string;
  radnik: string;
  datum: string;
  vrijeme: string;
  moguceOtkazati: boolean;
  mogucePotvrditi: boolean;
}

const OPIS_STATUSA: Record<StatusRezervacije, string> = {
  NEPOTVRDJENA: 'Čeka potvrdu',
  AKTIVNA: 'Potvrđena',
  OTKAZANA: 'Otkazana',
};

@Component({
  selector: 'app-moje-rezervacije',
  imports: [RouterLink, ZaglavljeComponent, UcitavanjeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './moje-rezervacije.component.html',
})
export class MojeRezervacijeComponent {
  private readonly api = inject(SalonApiService);
  private readonly obavijesti = inject(ObavijestiService);

  protected readonly OPIS_STATUSA = OPIS_STATUSA;
  protected readonly ucitavanje = signal(true);
  protected readonly obrada = signal<number | null>(null);
  protected readonly filtar = signal<StatusRezervacije | 'SVE'>('SVE');

  protected readonly FILTRI: { vrijednost: StatusRezervacije | 'SVE'; naziv: string }[] = [
    { vrijednost: 'SVE', naziv: 'Sve' },
    { vrijednost: 'AKTIVNA', naziv: 'Potvrđene' },
    { vrijednost: 'NEPOTVRDJENA', naziv: 'Čekaju potvrdu' },
    { vrijednost: 'OTKAZANA', naziv: 'Otkazane' },
  ];

  private readonly rezervacije = signal<RezervacijaOut[]>([]);
  private readonly usluge = signal<UslugaOut[]>([]);
  private readonly radnici = signal<RadnikOut[]>([]);

  protected readonly redci = computed<RedakRezervacije[]>(() => {
    const usluge = new Map(this.usluge().map((u) => [u.usluga_id, u]));
    const radnici = new Map(this.radnici().map((r) => [r.korisnik_id, r]));

    return this.rezervacije()
      .filter((r) => this.filtar() === 'SVE' || r.status === this.filtar())
      .map((rezervacija) => {
        const pocetak = izIsoBezZone(rezervacija.pocetak);
        const radnik = radnici.get(rezervacija.radnik_id);
        return {
          rezervacija,
          usluga: nazivUsluge(usluge.get(rezervacija.usluga_id)),
          radnik: radnik ? `${radnik.ime} ${radnik.prezime}` : `Radnik #${rezervacija.radnik_id}`,
          datum: opisDatuma(pocetak),
          vrijeme: `${uSatMinuta(pocetak)} – ${uSatMinuta(izIsoBezZone(rezervacija.kraj))}`,
          moguceOtkazati:
            rezervacija.status === 'AKTIVNA' || rezervacija.status === 'NEPOTVRDJENA',
          mogucePotvrditi: rezervacija.status === 'NEPOTVRDJENA',
        };
      })
      .sort(
        (a, b) =>
          izIsoBezZone(b.rezervacija.pocetak).getTime() -
          izIsoBezZone(a.rezervacija.pocetak).getTime(),
      );
  });

  constructor() {
    this.ucitaj();
  }

  protected postaviFiltar(vrijednost: StatusRezervacije | 'SVE'): void {
    this.filtar.set(vrijednost);
  }

  private ucitaj(): void {
    this.ucitavanje.set(true);
    forkJoin({
      rezervacije: this.api.rezervacije(),
      usluge: this.api.usluge(),
      radnici: this.api.radnici(),
    }).subscribe({
      next: ({ rezervacije, usluge, radnici }) => {
        this.rezervacije.set(rezervacije);
        this.usluge.set(usluge);
        this.radnici.set(radnici);
        this.ucitavanje.set(false);
      },
      error: (greska) => {
        this.ucitavanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Rezervacije nije moguće učitati.'));
      },
    });
  }

  protected potvrdi(rezervacijaId: number): void {
    this.obrada.set(rezervacijaId);
    this.api.potvrdiRezervaciju(rezervacijaId).subscribe({
      next: (azurirana) => {
        this.obrada.set(null);
        this.zamijeni(azurirana);
        this.obavijesti.uspjeh('Rezervacija je potvrđena.');
      },
      error: (greska) => {
        this.obrada.set(null);
        this.obavijesti.greska(porukaGreske(greska, 'Potvrda nije uspjela.'));
        this.ucitaj();
      },
    });
  }

  protected otkazi(rezervacijaId: number): void {
    this.obrada.set(rezervacijaId);
    this.api.otkaziRezervaciju(rezervacijaId).subscribe({
      next: (azurirana) => {
        this.obrada.set(null);
        this.zamijeni(azurirana);
        this.obavijesti.uspjeh('Rezervacija je otkazana.');
      },
      error: (greska) => {
        this.obrada.set(null);
        this.obavijesti.greska(porukaGreske(greska, 'Otkazivanje nije uspjelo.'));
        this.ucitaj();
      },
    });
  }

  private zamijeni(azurirana: RezervacijaOut): void {
    this.rezervacije.update((popis) =>
      popis.map((r) => (r.rezervacija_id === azurirana.rezervacija_id ? azurirana : r)),
    );
  }

  protected stilStatusa(status: StatusRezervacije): string {
    switch (status) {
      case 'AKTIVNA':
        return 'bg-[#E5F2E8] text-[#4A7C59]';
      case 'NEPOTVRDJENA':
        return 'bg-odabrano text-ruza-tamna';
      case 'OTKAZANA':
        return 'bg-[#F7E0E4] text-ruza-tamna';
      default:
        return 'bg-mekano text-tekst-tihi';
    }
  }
}
