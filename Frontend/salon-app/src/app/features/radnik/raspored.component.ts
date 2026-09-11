import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  KlijentKontaktOut,
  RadnikOut,
  RezervacijaOut,
  StatusRezervacije,
  UslugaOut,
} from '../../core/models/api.models';
import { KATEGORIJA_NAZIV, inicijali, nazivUsluge } from '../../core/models/katalog';
import { AuthService } from '../../core/services/auth.service';
import { ObavijestiService } from '../../core/services/obavijesti.service';
import { SalonApiService } from '../../core/services/salon-api.service';
import { porukaGreske } from '../../core/util/greska';
import {
  KRATKI_DANI,
  dodajDane,
  izIsoBezZone,
  pocetakDana,
  uSatMinuta,
} from '../../core/util/vrijeme';
import { UcitavanjeComponent } from '../../shared/ucitavanje.component';
import { ZaglavljeComponent } from '../../shared/zaglavlje.component';

interface TerminRedak {
  rezervacija: RezervacijaOut;
  vrijeme: string;
  vrijemeDo: string;
  klijent: string;
  telefon: string;
  usluga: string;
  otkazana: boolean;
}

const OPIS_STATUSA: Record<StatusRezervacije, string> = {
  NEPOTVRDJENA: 'Čeka potvrdu',
  AKTIVNA: 'Potvrđena',
  OTKAZANA: 'Otkazana',
};

@Component({
  selector: 'app-raspored',
  imports: [ZaglavljeComponent, UcitavanjeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './raspored.component.html',
})
export class RasporedComponent {
  private readonly api = inject(SalonApiService);
  private readonly auth = inject(AuthService);
  private readonly obavijesti = inject(ObavijestiService);

  protected readonly KRATKI_DANI = KRATKI_DANI;
  protected readonly OPIS_STATUSA = OPIS_STATUSA;
  protected readonly inicijali = inicijali;

  protected readonly ucitavanje = signal(true);
  protected readonly ucitavanjeDana = signal(false);
  protected readonly profil = signal<RadnikOut | null>(null);
  protected readonly mojeUsluge = signal<UslugaOut[]>([]);

  protected readonly dani = signal<Date[]>(
    Array.from({ length: 7 }, (_, pomak) => dodajDane(pocetakDana(new Date()), pomak)),
  );
  protected readonly odabraniDanIndeks = signal(0);

  private readonly rezervacije = signal<RezervacijaOut[]>([]);
  private readonly usluge = signal<UslugaOut[]>([]);
  private readonly klijenti = signal<KlijentKontaktOut[]>([]);

  /** Kategorije koje radnik pokriva — ekvivalent „specijalnosti” iz dizajna. */
  protected readonly specijalnosti = computed(() => {
    const kategorije = new Set(
      this.mojeUsluge()
        .map((u) => u.kategorija)
        .filter((k): k is NonNullable<typeof k> => k !== null),
    );
    return [...kategorije].map((k) => KATEGORIJA_NAZIV[k]).join(' · ');
  });

  protected readonly redci = computed<TerminRedak[]>(() => {
    const usluge = new Map(this.usluge().map((u) => [u.usluga_id, u]));
    const klijenti = new Map(this.klijenti().map((k) => [k.korisnik_id, k]));

    return this.rezervacije()
      .map((rezervacija) => {
        const klijent = klijenti.get(rezervacija.klijent_id);
        return {
          rezervacija,
          vrijeme: uSatMinuta(izIsoBezZone(rezervacija.pocetak)),
          vrijemeDo: uSatMinuta(izIsoBezZone(rezervacija.kraj)),
          klijent: klijent ? `${klijent.ime} ${klijent.prezime}` : 'Nepoznat klijent',
          telefon: klijent?.broj_telefona ?? '',
          usluga: nazivUsluge(usluge.get(rezervacija.usluga_id)),
          otkazana: rezervacija.status === 'OTKAZANA',
        };
      })
      .sort((a, b) => a.vrijeme.localeCompare(b.vrijeme));
  });

  constructor() {
    this.ucitajProfil();
  }

  protected odaberiDan(indeks: number): void {
    this.odabraniDanIndeks.set(indeks);
    this.ucitajDan();
  }

  private ucitajProfil(): void {
    const id = this.auth.korisnik()?.korisnik_id;
    if (id === undefined) {
      return;
    }

    this.ucitavanje.set(true);
    forkJoin({
      radnik: this.api.radnik(id),
      mojeUsluge: this.api.uslugeRadnika(id),
      usluge: this.api.usluge(),
      // Imena klijenata koji su rezervirali kod ovog radnika (bez OIB-a).
      klijenti: this.api.mojiKlijenti().pipe(catchError(() => of([] as KlijentKontaktOut[]))),
    }).subscribe({
      next: ({ radnik, mojeUsluge, usluge, klijenti }) => {
        this.profil.set(radnik);
        this.mojeUsluge.set(mojeUsluge);
        this.usluge.set(usluge);
        this.klijenti.set(klijenti);
        this.ucitavanje.set(false);
        this.ucitajDan();
      },
      error: (greska) => {
        this.ucitavanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Podatke nije moguće učitati.'));
      },
    });
  }

  private ucitajDan(): void {
    const dan = this.dani()[this.odabraniDanIndeks()];
    this.ucitavanjeDana.set(true);
    this.api.rezervacije({ datum: dan }).subscribe({
      next: (rezervacije) => {
        this.rezervacije.set(rezervacije);
        this.ucitavanjeDana.set(false);
      },
      error: (greska) => {
        this.ucitavanjeDana.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Raspored nije moguće učitati.'));
      },
    });
  }
}
