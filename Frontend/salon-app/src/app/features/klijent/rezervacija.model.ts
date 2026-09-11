import { KategorijaUsluge, UslugaOut } from '../../core/models/api.models';

export type Korak =
  | 'usluge'
  | 'vrste'
  | 'dodaj-jos'
  | 'radnik'
  | 'termin'
  | 'potvrda'
  | 'uspjeh';

/** Jedna kategorija s odabranim vrstama (depilacija ih može imati više). */
export interface OdabranaStavka {
  kategorija: KategorijaUsluge;
  naziv: string;
  usluge: UslugaOut[];
}

export interface Slot {
  pocetak: Date;
  oznaka: string;
  /** Kada termin završava — razmak između termina prati trajanje usluga. */
  oznakaKraja: string;
  slobodan: boolean;
}

export function cijenaStavke(stavka: OdabranaStavka): number {
  return stavka.usluge.reduce((zbroj, u) => zbroj + u.cijena, 0);
}

export function trajanjeStavke(stavka: OdabranaStavka): number {
  return stavka.usluge.reduce((zbroj, u) => zbroj + u.trajanje, 0);
}
