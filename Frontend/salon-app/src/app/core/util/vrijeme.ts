/**
 * Backend radi s „naive” lokalnim vremenom (datetime.now() bez vremenske zone),
 * pa se datumi šalju i čitaju bez oznake zone — inače bi ih preglednik pomaknuo.
 */

export function uIsoBezZone(datum: Date): string {
  const p = (broj: number) => String(broj).padStart(2, '0');
  return (
    `${datum.getFullYear()}-${p(datum.getMonth() + 1)}-${p(datum.getDate())}` +
    `T${p(datum.getHours())}:${p(datum.getMinutes())}:${p(datum.getSeconds())}`
  );
}

export function izIsoBezZone(tekst: string): Date {
  const [dio_datuma, dio_vremena = '00:00:00'] = tekst.split('T');
  const [godina, mjesec, dan] = dio_datuma.split('-').map(Number);
  const [sat, minuta, sekunda = 0] = dio_vremena.split(':').map(Number);
  return new Date(godina, mjesec - 1, dan, sat, minuta, Math.floor(sekunda));
}

/** YYYY-MM-DD u lokalnoj zoni — format koji backend očekuje u query parametru `datum`. */
export function uDatumParametar(datum: Date): string {
  const p = (broj: number) => String(broj).padStart(2, '0');
  return `${datum.getFullYear()}-${p(datum.getMonth() + 1)}-${p(datum.getDate())}`;
}

/** „09:30” iz Date ili iz backendovog "09:30:00". */
export function uSatMinuta(vrijednost: Date | string): string {
  if (typeof vrijednost === 'string') {
    return vrijednost.slice(0, 5);
  }
  const p = (broj: number) => String(broj).padStart(2, '0');
  return `${p(vrijednost.getHours())}:${p(vrijednost.getMinutes())}`;
}

/** Minute od ponoći — koristi se za presjek radnog vremena i zauzetih termina. */
export function minuteOdPonoci(vrijeme: string): number {
  const [sat, minuta] = vrijeme.split(':').map(Number);
  return sat * 60 + minuta;
}

export const KRATKI_DANI = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
export const PUNI_DANI = [
  'Nedjelja',
  'Ponedjeljak',
  'Utorak',
  'Srijeda',
  'Četvrtak',
  'Petak',
  'Subota',
];

/** ISO dan u tjednu: 1 = ponedjeljak … 7 = nedjelja (kao u bazi). */
export function isoDanUTjednu(datum: Date): number {
  const dan = datum.getDay();
  return dan === 0 ? 7 : dan;
}

export function imeIsoDana(dan: number): string {
  return PUNI_DANI[dan === 7 ? 0 : dan];
}

export function pocetakDana(datum: Date): Date {
  return new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
}

export function dodajDane(datum: Date, broj: number): Date {
  const novi = new Date(datum);
  novi.setDate(novi.getDate() + broj);
  return novi;
}

export function dodajMinute(datum: Date, broj: number): Date {
  return new Date(datum.getTime() + broj * 60_000);
}

/** „pon, 15. ruj” — kratki opis termina u sažetku. */
export function opisDatuma(datum: Date): string {
  return datum.toLocaleDateString('hr-HR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatirajOdbrojavanje(sekundi: number): string {
  const minute = Math.floor(Math.max(0, sekundi) / 60);
  const ostatak = Math.max(0, sekundi) % 60;
  return `${minute}:${String(ostatak).padStart(2, '0')}`;
}
