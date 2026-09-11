import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  KlijentKontaktOut,
  KlijentOut,
  KorisnikOut,
  RadnikOut,
  RadnoVrijemeCreate,
  RadnoVrijemeOut,
  RegisterRadnikIn,
  RezervacijaCreate,
  RezervacijaOut,
  StatusRezervacije,
  UslugaCreate,
  UslugaOut,
  UslugaUpdate,
  ZauzetTerminOut,
} from '../models/api.models';
import { uDatumParametar } from '../util/vrijeme';

/** Jedno mjesto za sve rute definirane u Salon/Backend/api/routers. */
@Injectable({ providedIn: 'root' })
export class SalonApiService {
  private readonly http = inject(HttpClient);
  private readonly osnova = environment.apiUrl;

  // --- radnici -------------------------------------------------------------

  radnici(): Observable<RadnikOut[]> {
    return this.http.get<RadnikOut[]>(`${this.osnova}/radnici`);
  }

  radnik(radnikId: number): Observable<RadnikOut> {
    return this.http.get<RadnikOut>(`${this.osnova}/radnici/${radnikId}`);
  }

  stvoriRadnika(podaci: RegisterRadnikIn): Observable<KorisnikOut> {
    return this.http.post<KorisnikOut>(`${this.osnova}/radnici`, podaci);
  }

  // --- klijenti (admin) ----------------------------------------------------

  klijenti(): Observable<KlijentOut[]> {
    return this.http.get<KlijentOut[]>(`${this.osnova}/klijenti`);
  }

  klijent(klijentId: number): Observable<KlijentOut> {
    return this.http.get<KlijentOut>(`${this.osnova}/klijenti/${klijentId}`);
  }

  /** Klijenti prijavljenog radnika — imena bez OIB-a, dostupno i bez admin ovlasti. */
  mojiKlijenti(): Observable<KlijentKontaktOut[]> {
    return this.http.get<KlijentKontaktOut[]>(`${this.osnova}/klijenti/moji`);
  }

  // --- usluge --------------------------------------------------------------

  usluge(): Observable<UslugaOut[]> {
    return this.http.get<UslugaOut[]>(`${this.osnova}/usluge`);
  }

  usluga(uslugaId: number): Observable<UslugaOut> {
    return this.http.get<UslugaOut>(`${this.osnova}/usluge/${uslugaId}`);
  }

  radniciZaUslugu(uslugaId: number): Observable<RadnikOut[]> {
    return this.http.get<RadnikOut[]>(`${this.osnova}/usluge/${uslugaId}/radnici`);
  }

  stvoriUslugu(podaci: UslugaCreate): Observable<UslugaOut> {
    return this.http.post<UslugaOut>(`${this.osnova}/usluge`, podaci);
  }

  izmijeniUslugu(uslugaId: number, podaci: UslugaUpdate): Observable<UslugaOut> {
    return this.http.put<UslugaOut>(`${this.osnova}/usluge/${uslugaId}`, podaci);
  }

  obrisiUslugu(uslugaId: number): Observable<void> {
    return this.http.delete<void>(`${this.osnova}/usluge/${uslugaId}`);
  }

  uslugeRadnika(radnikId: number): Observable<UslugaOut[]> {
    return this.http.get<UslugaOut[]>(`${this.osnova}/radnici/${radnikId}/usluge`);
  }

  dodijeliUslugu(radnikId: number, uslugaId: number): Observable<unknown> {
    return this.http.post(`${this.osnova}/radnici/${radnikId}/usluge`, { usluga_id: uslugaId });
  }

  ukloniUslugu(radnikId: number, uslugaId: number): Observable<void> {
    return this.http.delete<void>(`${this.osnova}/radnici/${radnikId}/usluge/${uslugaId}`);
  }

  // --- radno vrijeme -------------------------------------------------------

  radnoVrijeme(radnikId: number): Observable<RadnoVrijemeOut[]> {
    return this.http.get<RadnoVrijemeOut[]>(`${this.osnova}/radnici/${radnikId}/radno-vrijeme`);
  }

  dodajRadnoVrijeme(radnikId: number, podaci: RadnoVrijemeCreate): Observable<RadnoVrijemeOut> {
    return this.http.post<RadnoVrijemeOut>(
      `${this.osnova}/radnici/${radnikId}/radno-vrijeme`,
      podaci,
    );
  }

  obrisiRadnoVrijeme(radnikId: number, radnoVrijemeId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.osnova}/radnici/${radnikId}/radno-vrijeme/${radnoVrijemeId}`,
    );
  }

  // --- rezervacije ---------------------------------------------------------

  stvoriRezervaciju(podaci: RezervacijaCreate): Observable<RezervacijaOut> {
    return this.http.post<RezervacijaOut>(`${this.osnova}/rezervacije`, podaci);
  }

  potvrdiRezervaciju(rezervacijaId: number): Observable<RezervacijaOut> {
    return this.http.post<RezervacijaOut>(
      `${this.osnova}/rezervacije/${rezervacijaId}/potvrdi`,
      {},
    );
  }

  otkaziRezervaciju(rezervacijaId: number): Observable<RezervacijaOut> {
    return this.http.post<RezervacijaOut>(`${this.osnova}/rezervacije/${rezervacijaId}/otkazi`, {});
  }

  rezervacija(rezervacijaId: number): Observable<RezervacijaOut> {
    return this.http.get<RezervacijaOut>(`${this.osnova}/rezervacije/${rezervacijaId}`);
  }

  zauzetiTermini(radnikId: number, datum: Date): Observable<ZauzetTerminOut[]> {
    const parametri = new HttpParams()
      .set('radnik_id', radnikId)
      .set('datum', uDatumParametar(datum));
    return this.http.get<ZauzetTerminOut[]>(`${this.osnova}/rezervacije/zauzeti-termini`, {
      params: parametri,
    });
  }

  rezervacije(filtri: {
    status?: StatusRezervacije;
    datum?: Date;
    radnikId?: number;
    klijentId?: number;
  } = {}): Observable<RezervacijaOut[]> {
    let parametri = new HttpParams();
    if (filtri.status) {
      parametri = parametri.set('status', filtri.status);
    }
    if (filtri.datum) {
      parametri = parametri.set('datum', uDatumParametar(filtri.datum));
    }
    if (filtri.radnikId !== undefined) {
      parametri = parametri.set('radnik_id', filtri.radnikId);
    }
    if (filtri.klijentId !== undefined) {
      parametri = parametri.set('klijent_id', filtri.klijentId);
    }
    return this.http.get<RezervacijaOut[]>(`${this.osnova}/rezervacije`, { params: parametri });
  }

  rokPotvrde(): Observable<{ minuta: number }> {
    return this.http.get<{ minuta: number }>(`${this.osnova}/rezervacije/rok-potvrde`);
  }
}
