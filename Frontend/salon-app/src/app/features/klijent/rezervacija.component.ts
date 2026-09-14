import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, from, of } from 'rxjs';
import { catchError, concatMap, toArray } from 'rxjs/operators';

import {
  KategorijaUsluge,
  RadnikOut,
  RezervacijaOut,
  UslugaOut,
  ZauzetTerminOut,
} from '../../core/models/api.models';
import {
  KATEGORIJE,
  KategorijaInfo,
  bojaAvatara,
  inicijali,
  kategorijaInfo,
} from '../../core/models/katalog';
import { ObavijestiService } from '../../core/services/obavijesti.service';
import { SalonApiService } from '../../core/services/salon-api.service';
import { porukaGreske } from '../../core/util/greska';
import {
  KRATKI_DANI,
  dodajDane,
  dodajMinute,
  formatirajOdbrojavanje,
  izIsoBezZone,
  isoDanUTjednu,
  minuteOdPonoci,
  opisDatuma,
  pocetakDana,
  uIsoBezZone,
  uSatMinuta,
} from '../../core/util/vrijeme';
import { UcitavanjeComponent } from '../../shared/ucitavanje.component';
import { ZaglavljeComponent } from '../../shared/zaglavlje.component';
import { Korak, OdabranaStavka, Slot, cijenaStavke } from './rezervacija.model';

@Component({
  selector: 'app-rezervacija',
  imports: [RouterLink, ZaglavljeComponent, UcitavanjeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rezervacija.component.html',
})
export class RezervacijaComponent implements OnDestroy {
  private readonly api = inject(SalonApiService);
  private readonly obavijesti = inject(ObavijestiService);

  protected readonly KRATKI_DANI = KRATKI_DANI;
  protected readonly bojaAvatara = bojaAvatara;
  protected readonly inicijali = inicijali;
  protected readonly uSatMinuta = uSatMinuta;
  protected readonly opisDatuma = opisDatuma;
  protected readonly cijenaStavke = cijenaStavke;

  protected readonly korak = signal<Korak>('usluge');
  protected readonly ucitavanje = signal(true);
  protected readonly ucitavanjeTermina = signal(false);
  protected readonly obrada = signal(false);

  private readonly sveUsluge = signal<UslugaOut[]>([]);
  protected readonly aktivnaKategorija = signal<KategorijaUsluge | null>(null);
  protected readonly aktivneVrste = signal<number[]>([]);
  protected readonly odabrane = signal<OdabranaStavka[]>([]);

  protected readonly radnici = signal<RadnikOut[]>([]);
  protected readonly odabraniRadnikId = signal<number | null>(null);

  protected readonly dani = signal<Date[]>(
    Array.from({ length: 7 }, (_, pomak) => dodajDane(pocetakDana(new Date()), pomak)),
  );
  protected readonly odabraniDanIndeks = signal(0);
  protected readonly slotovi = signal<Slot[]>([]);
  protected readonly odabraniTermin = signal<Date | null>(null);
  protected readonly nemaRadnogVremena = signal(false);

  /** Poruka radniku; šalje se uz svaku rezervaciju iz ovog odabira. */
  protected readonly napomena = signal('');

  protected readonly nacinPlacanja = signal<'kartica' | 'salon' | null>(null);
  protected readonly drzanja = signal<RezervacijaOut[]>([]);
  protected readonly preostaloSekundi = signal(0);
  private mjeracId: ReturnType<typeof setInterval> | null = null;

  // --- izvedeno stanje -----------------------------------------------------

  /** Prikazuju se samo kategorije koje stvarno imaju unesene usluge. */
  protected readonly kategorije = computed<KategorijaInfo[]>(() => {
    const postojece = new Set(this.sveUsluge().map((u) => u.kategorija));
    return KATEGORIJE.filter((k) => postojece.has(k.kategorija));
  });

  protected readonly aktivnaInfo = computed(() => kategorijaInfo(this.aktivnaKategorija()));

  protected readonly vrsteAktivneKategorije = computed(() =>
    this.sveUsluge().filter((u) => u.kategorija === this.aktivnaKategorija()),
  );

  protected readonly odabraneUsluge = computed(() =>
    this.odabrane().flatMap((stavka) => stavka.usluge),
  );

  protected readonly ukupnaCijena = computed(() =>
    this.odabraneUsluge().reduce((zbroj, u) => zbroj + u.cijena, 0),
  );

  protected readonly ukupnoTrajanje = computed(() =>
    this.odabraneUsluge().reduce((zbroj, u) => zbroj + u.trajanje, 0),
  );

  protected readonly odabraniRadnik = computed(
    () => this.radnici().find((r) => r.korisnik_id === this.odabraniRadnikId()) ?? null,
  );

  protected readonly odabraniDan = computed(() => this.dani()[this.odabraniDanIndeks()]);

  protected readonly odbrojavanje = computed(() => formatirajOdbrojavanje(this.preostaloSekundi()));

  /** Prije nego korisnik uopće nešto odabere nema što otkazati. */
  protected readonly prikaziOdustani = computed(
    () => this.korak() !== 'usluge' && this.korak() !== 'uspjeh',
  );

  constructor() {
    this.ucitajUsluge();
  }

  ngOnDestroy(): void {
    this.otpustiDrzanja();
  }

  private ucitajUsluge(): void {
    this.ucitavanje.set(true);
    this.api.usluge().subscribe({
      next: (usluge) => {
        this.sveUsluge.set(usluge);
        this.ucitavanje.set(false);
      },
      error: (greska) => {
        this.ucitavanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Usluge nije moguće učitati.'));
      },
    });
  }

  // --- korak 1: kategorije -------------------------------------------------

  protected jeOdabranaKategorija(kategorija: KategorijaUsluge): boolean {
    return this.odabrane().some((stavka) => stavka.kategorija === kategorija);
  }

  protected otvoriKategoriju(kategorija: KategorijaUsluge): void {
    const postojeca = this.odabrane().find((stavka) => stavka.kategorija === kategorija);
    this.aktivnaKategorija.set(kategorija);
    this.aktivneVrste.set(postojeca ? postojeca.usluge.map((u) => u.usluga_id) : []);
    this.korak.set('vrste');
  }

  // --- korak 2: vrste unutar kategorije ------------------------------------

  protected jeOdabranaVrsta(uslugaId: number): boolean {
    return this.aktivneVrste().includes(uslugaId);
  }

  protected prebaciVrstu(uslugaId: number): void {
    if (!this.aktivnaInfo()?.visestruko) {
      this.aktivneVrste.set([uslugaId]);
      return;
    }
    this.aktivneVrste.update((popis) =>
      popis.includes(uslugaId) ? popis.filter((id) => id !== uslugaId) : [...popis, uslugaId],
    );
  }

  protected potvrdiVrste(): void {
    const kategorija = this.aktivnaKategorija();
    const info = this.aktivnaInfo();
    if (!kategorija || !info || this.aktivneVrste().length === 0) {
      return;
    }

    const stavka: OdabranaStavka = {
      kategorija,
      naziv: info.naziv,
      usluge: this.vrsteAktivneKategorije().filter((u) =>
        this.aktivneVrste().includes(u.usluga_id),
      ),
    };

    this.odabrane.update((popis) => [...popis.filter((s) => s.kategorija !== kategorija), stavka]);
    this.ponistiOdabirRadnika();
    this.korak.set('dodaj-jos');
  }

  protected ukloniStavku(kategorija: KategorijaUsluge): void {
    this.odabrane.update((popis) => popis.filter((s) => s.kategorija !== kategorija));
    this.ponistiOdabirRadnika();
  }

  // --- korak 3 i 4: radnici ------------------------------------------------

  protected naKategorije(): void {
    this.aktivnaKategorija.set(null);
    this.aktivneVrste.set([]);
    this.korak.set('usluge');
  }

  protected naRadnike(): void {
    if (this.odabrane().length === 0) {
      return;
    }
    this.korak.set('radnik');
    this.ucitajRadnike();
  }

  /** Radnik mora nuditi sve odabrane usluge, pa se popisi po usluzi presijecaju. */
  private ucitajRadnike(): void {
    const usluge = this.odabraneUsluge();
    if (usluge.length === 0) {
      return;
    }

    this.ucitavanje.set(true);
    forkJoin(usluge.map((u) => this.api.radniciZaUslugu(u.usluga_id))).subscribe({
      next: (popisi) => {
        const presjek = popisi.reduce((zajednicki, popis) =>
          zajednicki.filter((r) => popis.some((drugi) => drugi.korisnik_id === r.korisnik_id)),
        );
        this.radnici.set(presjek);
        this.ucitavanje.set(false);
      },
      error: (greska) => {
        this.ucitavanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Radnike nije moguće učitati.'));
      },
    });
  }

  protected odaberiRadnika(radnikId: number): void {
    this.odabraniRadnikId.set(radnikId);
    this.odabraniTermin.set(null);
  }

  private ponistiOdabirRadnika(): void {
    this.odabraniRadnikId.set(null);
    this.odabraniTermin.set(null);
    this.slotovi.set([]);
  }

  // --- korak 5: termin -----------------------------------------------------

  protected naTermine(): void {
    if (this.odabraniRadnikId() === null) {
      return;
    }
    this.korak.set('termin');
    this.ucitajSlotove();
  }

  protected odaberiDan(indeks: number): void {
    this.odabraniDanIndeks.set(indeks);
    this.odabraniTermin.set(null);
    this.ucitajSlotove();
  }

  protected odaberiTermin(slot: Slot): void {
    if (slot.slobodan) {
      this.odabraniTermin.set(slot.pocetak);
    }
  }

  protected jeOdabranTermin(slot: Slot): boolean {
    return this.odabraniTermin()?.getTime() === slot.pocetak.getTime();
  }

  protected postaviNapomenu(vrijednost: string): void {
    this.napomena.set(vrijednost.slice(0, 500));
  }

  /** Slobodni termini = radno vrijeme radnika minus zauzeti termini, uz trajanje svih usluga. */
  private ucitajSlotove(): void {
    const radnikId = this.odabraniRadnikId();
    const dan = this.odabraniDan();
    if (radnikId === null || !dan) {
      return;
    }

    this.ucitavanjeTermina.set(true);
    this.nemaRadnogVremena.set(false);

    forkJoin({
      radnoVrijeme: this.api.radnoVrijeme(radnikId),
      zauzeti: this.api.zauzetiTermini(radnikId, dan),
    }).subscribe({
      next: ({ radnoVrijeme, zauzeti }) => {
        const danUTjednu = isoDanUTjednu(dan);
        const intervali = radnoVrijeme.filter((rv) => rv.dan_u_tjednu === danUTjednu);
        this.nemaRadnogVremena.set(intervali.length === 0);
        this.slotovi.set(this.izracunajSlotove(dan, intervali, zauzeti));
        this.ucitavanjeTermina.set(false);
      },
      error: (greska) => {
        this.ucitavanjeTermina.set(false);
        this.slotovi.set([]);
        this.obavijesti.greska(porukaGreske(greska, 'Termine nije moguće učitati.'));
      },
    });
  }

  /**
   * Termini se nižu jedan za drugim unutar slobodnih praznina radnog vremena,
   * korakom jednakim trajanju odabranih usluga. Kratka usluga tako daje gušću
   * ponudu, duga rjeđu, a nakon tuđe rezervacije sljedeći termin počinje točno
   * kad ona završi — bez praznog hoda i bez termina koji se međusobno isključuju.
   */
  private izracunajSlotove(
    dan: Date,
    intervali: { vrijeme_od: string; vrijeme_do: string }[],
    zauzeti: ZauzetTerminOut[],
  ): Slot[] {
    const trajanje = this.ukupnoTrajanje();
    if (trajanje <= 0) {
      return [];
    }

    const sada = Date.now();
    const korakMs = trajanje * 60_000;

    const zauzetiRasponi = zauzeti
      .map((z) => ({
        od: izIsoBezZone(z.pocetak).getTime(),
        doKad: izIsoBezZone(z.kraj).getTime(),
      }))
      .sort((a, b) => a.od - b.od);

    const radniIntervali = intervali.map((interval) => ({
      od: dodajMinute(dan, minuteOdPonoci(interval.vrijeme_od)).getTime(),
      doKad: dodajMinute(dan, minuteOdPonoci(interval.vrijeme_do)).getTime(),
    }));

    // Ključ je početak termina — predložak prati slotove po tom vremenu, pa ne smije biti duplikata.
    const slotovi = new Map<number, Slot>();

    const upisi = (pocetak: number, kraj: number, slobodan: boolean): void => {
      if (slotovi.has(pocetak)) {
        return;
      }
      slotovi.set(pocetak, {
        pocetak: new Date(pocetak),
        oznaka: uSatMinuta(new Date(pocetak)),
        oznakaKraja: uSatMinuta(new Date(kraj)),
        slobodan,
      });
    };

    const napuniPrazninu = (od: number, doKad: number): void => {
      for (let pocetak = od; pocetak + korakMs <= doKad; pocetak += korakMs) {
        if (pocetak > sada) {
          upisi(pocetak, pocetak + korakMs, true);
        }
      }
    };

    // Zauzeti termini ostaju vidljivi (precrtani) da se vidi zašto je ponuda rijetka.
    for (const raspon of zauzetiRasponi) {
      const uRadnomVremenu = radniIntervali.some(
        (radni) => raspon.od < radni.doKad && radni.od < raspon.doKad,
      );
      if (uRadnomVremenu && raspon.doKad > sada) {
        upisi(raspon.od, raspon.doKad, false);
      }
    }

    // Slobodne praznine = radni interval umanjen za zauzete termine.
    for (const radni of radniIntervali) {
      let od = radni.od;
      for (const raspon of zauzetiRasponi) {
        if (raspon.doKad <= radni.od || raspon.od >= radni.doKad) {
          continue;
        }
        if (raspon.od > od) {
          napuniPrazninu(od, Math.min(raspon.od, radni.doKad));
        }
        od = Math.max(od, raspon.doKad);
      }
      napuniPrazninu(od, radni.doKad);
    }

    return [...slotovi.values()].sort((a, b) => a.pocetak.getTime() - b.pocetak.getTime());
  }

  // --- korak 6: privremeno držanje termina i potvrda ------------------------

  /**
   * Ulaskom na potvrdu backend privremeno drži termin (status NEPOTVRDJENA).
   * Backend veže jednu uslugu po rezervaciji, pa se odabrane usluge nižu jedna na drugu.
   */
  protected naPotvrdu(): void {
    const radnikId = this.odabraniRadnikId();
    const pocetak = this.odabraniTermin();
    if (radnikId === null || !pocetak || this.obrada()) {
      return;
    }

    const napomena = this.napomena().trim() || null;
    let pomak = 0;
    const zahtjevi = this.odabraneUsluge().map((usluga) => {
      const pocetakUsluge = dodajMinute(pocetak, pomak);
      pomak += usluga.trajanje;
      return {
        radnik_id: radnikId,
        usluga_id: usluga.usluga_id,
        pocetak: uIsoBezZone(pocetakUsluge),
        napomena,
      };
    });

    this.obrada.set(true);
    from(zahtjevi)
      .pipe(
        concatMap((zahtjev) => this.api.stvoriRezervaciju(zahtjev)),
        toArray(),
      )
      .subscribe({
        next: (stvorene) => {
          this.obrada.set(false);
          this.drzanja.set(stvorene);
          this.korak.set('potvrda');
          this.pokreniMjerac(stvorene);
        },
        error: (greska) => {
          this.obrada.set(false);
          this.obavijesti.greska(porukaGreske(greska, 'Termin nije moguće rezervirati.'));
          this.otpustiDrzanja();
          this.ucitajSlotove();
        },
      });
  }

  private pokreniMjerac(stvorene: RezervacijaOut[]): void {
    this.zaustaviMjerac();
    const sekundi = stvorene
      .map((r) => r.sekundi_do_isteka ?? 0)
      .reduce((najmanje, vrijednost) => Math.min(najmanje, vrijednost), Number.MAX_SAFE_INTEGER);
    this.preostaloSekundi.set(Number.isFinite(sekundi) ? sekundi : 0);

    this.mjeracId = setInterval(() => {
      const preostalo = this.preostaloSekundi() - 1;
      this.preostaloSekundi.set(Math.max(0, preostalo));
      if (preostalo <= 0) {
        this.zaustaviMjerac();
        this.obavijesti.greska('Rok za potvrdu je istekao — termin je oslobođen.');
        this.drzanja.set([]);
        this.odabraniTermin.set(null);
        this.korak.set('termin');
        this.ucitajSlotove();
      }
    }, 1000);
  }

  private zaustaviMjerac(): void {
    if (this.mjeracId !== null) {
      clearInterval(this.mjeracId);
      this.mjeracId = null;
    }
  }

  /** Napuštanje potvrde oslobađa termin umjesto čekanja isteka roka. */
  private otpustiDrzanja(): void {
    const drzanja = this.drzanja();
    this.drzanja.set([]);
    this.zaustaviMjerac();
    if (drzanja.length === 0) {
      return;
    }
    from(drzanja)
      .pipe(
        concatMap((r) =>
          this.api.otkaziRezervaciju(r.rezervacija_id).pipe(catchError(() => of(null))),
        ),
        toArray(),
      )
      .subscribe();
  }

  protected natragNaTermine(): void {
    this.otpustiDrzanja();
    this.korak.set('termin');
    this.ucitajSlotove();
  }

  protected odaberiPlacanje(nacin: 'kartica' | 'salon'): void {
    this.nacinPlacanja.set(nacin);
  }

  protected potvrdiRezervaciju(): void {
    if (!this.nacinPlacanja() || this.obrada() || this.drzanja().length === 0) {
      return;
    }

    this.obrada.set(true);
    from(this.drzanja())
      .pipe(
        concatMap((r) => this.api.potvrdiRezervaciju(r.rezervacija_id)),
        toArray(),
      )
      .subscribe({
        next: (potvrdene) => {
          this.obrada.set(false);
          this.zaustaviMjerac();
          this.drzanja.set(potvrdene);
          this.korak.set('uspjeh');
        },
        error: (greska) => {
          this.obrada.set(false);
          this.obavijesti.greska(porukaGreske(greska, 'Potvrda rezervacije nije uspjela.'));
        },
      });
  }

  /**
   * Odustajanje je dostupno u bilo kojem koraku prije plaćanja. Eventualno
   * privremeno držanje termina oslobađa se isto kao kod isteka roka od 10 min.
   */
  protected odustaniOdRezervacije(): void {
    if (this.obrada() || !confirm('Jeste li sigurni da želite odustati od rezervacije?')) {
      return;
    }
    this.otpustiDrzanja();
    this.naPocetak();
  }

  protected naPocetak(): void {
    this.zaustaviMjerac();
    this.odabrane.set([]);
    this.aktivnaKategorija.set(null);
    this.aktivneVrste.set([]);
    this.radnici.set([]);
    this.ponistiOdabirRadnika();
    this.odabraniDanIndeks.set(0);
    this.napomena.set('');
    this.nacinPlacanja.set(null);
    this.drzanja.set([]);
    this.korak.set('usluge');
  }
}
