import { KategorijaUsluge, UslugaOut } from './api.models';

/**
 * Prezentacijski podaci za kategorije usluga — nazivi, opisi i slike iz dizajna.
 * Backend vraća samo enum, pa se ovdje veže na ono što korisnik vidi.
 */
export interface KategorijaInfo {
  kategorija: KategorijaUsluge;
  naziv: string;
  opis: string;
  slika: string;
  /** Depilacija se u dizajnu bira kao više područja odjednom. */
  visestruko: boolean;
  /** Naslov iznad popisa vrsta na ekranu odabira. */
  uputa: string;
}

export const KATEGORIJE: KategorijaInfo[] = [
  {
    kategorija: 'NOKTI',
    naziv: 'Nokti',
    opis: 'Manikura i ugradnja',
    slika: 'assets/nokti.jpg',
    visestruko: false,
    uputa: 'Odaberite vrstu tretmana',
  },
  {
    kategorija: 'SMINKANJE',
    naziv: 'Šminkanje',
    opis: 'Za posebne prilike i svaki dan',
    slika: 'assets/sminka.jpg',
    visestruko: false,
    uputa: 'Odaberite vrstu šminke',
  },
  {
    kategorija: 'DEPILACIJA_VOSKOM',
    naziv: 'Depilacija voskom',
    opis: 'Odaberite jedno ili više područja',
    slika: 'assets/depilacija.jpg',
    visestruko: true,
    uputa: 'Odaberite jedno ili više područja',
  },
  {
    kategorija: 'TREPAVICE',
    naziv: 'Trepavice',
    opis: 'Lash lift ili ugradnja',
    slika: 'assets/trepavice.jpg',
    visestruko: false,
    uputa: 'Odaberite vrstu tretmana',
  },
  {
    kategorija: 'OBRVE',
    naziv: 'Obrve',
    opis: 'Oblikovanje, lift ili microblading',
    slika: 'assets/obrve.jpg',
    visestruko: false,
    uputa: 'Odaberite vrstu tretmana',
  },
];

export const KATEGORIJA_NAZIV: Record<KategorijaUsluge, string> = KATEGORIJE.reduce(
  (mapa, k) => ({ ...mapa, [k.kategorija]: k.naziv }),
  {} as Record<KategorijaUsluge, string>,
);

export function kategorijaInfo(kategorija: KategorijaUsluge | null): KategorijaInfo | undefined {
  return KATEGORIJE.find((k) => k.kategorija === kategorija);
}

/** Puni naziv usluge, npr. „Nokti — Trajni lak”. */
export function nazivUsluge(usluga: UslugaOut | undefined): string {
  if (!usluga) {
    return 'Nepoznata usluga';
  }
  const naziv = usluga.kategorija ? KATEGORIJA_NAZIV[usluga.kategorija] : 'Usluga';
  return usluga.vrsta ? `${naziv} — ${usluga.vrsta}` : naziv;
}

/** Inicijali za avatar (isti izgled kao u dizajnu). */
export function inicijali(ime: string, prezime: string): string {
  return `${ime.charAt(0)}${prezime.charAt(0)}`.toUpperCase();
}

const PALETA_AVATARA = ['#D9A0AE', '#C98A9E', '#E0B4BE', '#B8798E', '#CB94A6'];

export function bojaAvatara(id: number): string {
  return PALETA_AVATARA[id % PALETA_AVATARA.length];
}
