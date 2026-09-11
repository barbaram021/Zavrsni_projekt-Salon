/** Tipovi preslikani 1:1 na Pydantic sheme iz Salon/Backend/schemas. */

export type Uloga = 'KLIJENT' | 'RADNIK' | 'ADMIN';

export type KategorijaUsluge =
  | 'NOKTI'
  | 'DEPILACIJA_VOSKOM'
  | 'TREPAVICE'
  | 'OBRVE'
  | 'SMINKANJE';

export type StatusRezervacije = 'NEPOTVRDJENA' | 'AKTIVNA' | 'OTKAZANA';

export interface Token {
  access_token: string;
  token_type: string;
}

export interface KorisnikOut {
  korisnik_id: number;
  email: string;
  uloga: Uloga;
}

export interface RegisterKlijentIn {
  email: string;
  password: string;
  oib: string;
  ime: string;
  prezime: string;
  broj_telefona: string;
}

export interface RegisterRadnikIn {
  email: string;
  password: string;
  ime: string;
  prezime: string;
  broj_telefona: string;
  placa?: number | null;
}

export interface RadnikOut {
  korisnik_id: number;
  ime: string;
  prezime: string;
  broj_telefona: string;
}

export interface KlijentOut {
  korisnik_id: number;
  oib: string;
  ime: string;
  prezime: string;
  broj_telefona: string;
}

/** Klijent bez OIB-a — ono što radnik smije vidjeti o svojim klijentima. */
export interface KlijentKontaktOut {
  korisnik_id: number;
  ime: string;
  prezime: string;
  broj_telefona: string;
}

export interface UslugaOut {
  usluga_id: number;
  trajanje: number;
  cijena: number;
  kategorija: KategorijaUsluge | null;
  vrsta: string | null;
}

export interface UslugaCreate {
  trajanje: number;
  cijena: number;
  kategorija: KategorijaUsluge;
  vrsta: string;
}

export interface UslugaUpdate {
  trajanje: number;
  cijena: number;
  vrsta: string;
}

export interface RadnoVrijemeOut {
  radno_vrijeme_id: number;
  radnik_id: number;
  dan_u_tjednu: number;
  vrijeme_od: string;
  vrijeme_do: string;
}

export interface RadnoVrijemeCreate {
  dan_u_tjednu: number;
  vrijeme_od: string;
  vrijeme_do: string;
}

export interface RezervacijaCreate {
  radnik_id: number;
  usluga_id: number;
  pocetak: string;
  napomena?: string | null;
}

export interface RezervacijaOut {
  rezervacija_id: number;
  klijent_id: number;
  radnik_id: number;
  usluga_id: number;
  pocetak: string;
  kraj: string;
  status: StatusRezervacije;
  napomena: string | null;
  rezervirano_do: string | null;
  sekundi_do_isteka: number | null;
}

export interface ZauzetTerminOut {
  pocetak: string;
  kraj: string;
  privremeno: boolean;
}
