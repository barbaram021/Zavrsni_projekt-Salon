import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { KorisnikOut, RegisterKlijentIn, Token, Uloga } from '../models/api.models';

const KLJUC_TOKENA = 'salon_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(procitajToken());
  private readonly _korisnik = signal<KorisnikOut | null>(null);

  readonly korisnik = this._korisnik.asReadonly();
  readonly prijavljen = computed(() => this._token() !== null);
  readonly uloga = computed<Uloga | null>(() => this._korisnik()?.uloga ?? null);
  readonly jeKlijent = computed(() => this.uloga() === 'KLIJENT');
  readonly jeRadnik = computed(() => this.uloga() === 'RADNIK');
  readonly jeAdmin = computed(() => this.uloga() === 'ADMIN');

  token(): string | null {
    return this._token();
  }

  /** Backend očekuje OAuth2 form-urlencoded tijelo na /auth/login. */
  prijava(email: string, lozinka: string): Observable<Token> {
    const tijelo = new URLSearchParams();
    tijelo.set('username', email);
    tijelo.set('password', lozinka);

    return this.http
      .post<Token>(`${environment.apiUrl}/auth/login`, tijelo.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(tap((odgovor) => this.spremiToken(odgovor.access_token)));
  }

  registracija(podaci: RegisterKlijentIn): Observable<KorisnikOut> {
    return this.http.post<KorisnikOut>(`${environment.apiUrl}/auth/register`, podaci);
  }

  ucitajProfil(): Observable<KorisnikOut> {
    return this.http
      .get<KorisnikOut>(`${environment.apiUrl}/auth/me`)
      .pipe(tap((korisnik) => this._korisnik.set(korisnik)));
  }

  odjava(): void {
    localStorage.removeItem(KLJUC_TOKENA);
    this._token.set(null);
    this._korisnik.set(null);
    void this.router.navigate(['/prijava']);
  }

  /** Početna ruta ovisi o ulozi — svaka uloga ima svoj dio aplikacije. */
  pocetnaRuta(uloga: Uloga): string {
    switch (uloga) {
      case 'ADMIN':
        return '/admin';
      case 'RADNIK':
        return '/radnik';
      default:
        return '/rezervacija';
    }
  }

  private spremiToken(token: string): void {
    localStorage.setItem(KLJUC_TOKENA, token);
    this._token.set(token);
  }
}

function procitajToken(): string | null {
  try {
    return localStorage.getItem(KLJUC_TOKENA);
  } catch {
    return null;
  }
}
