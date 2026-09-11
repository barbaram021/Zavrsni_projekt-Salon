import { HttpErrorResponse } from '@angular/common/http';

/** Izvlači poruku iz FastAPI odgovora (`detail` je string ili lista grešaka validacije). */
export function porukaGreske(greska: unknown, zadana = 'Došlo je do pogreške.'): string {
  if (!(greska instanceof HttpErrorResponse)) {
    return zadana;
  }
  if (greska.status === 0) {
    return 'Poslužitelj nije dostupan. Provjerite je li backend pokrenut.';
  }

  const detalj = greska.error?.detail;
  if (typeof detalj === 'string') {
    return detalj;
  }
  if (Array.isArray(detalj)) {
    const poruke = detalj
      .map((stavka) => (typeof stavka?.msg === 'string' ? stavka.msg : null))
      .filter((poruka): poruka is string => poruka !== null);
    if (poruke.length) {
      return poruke.join(' ');
    }
  }
  return zadana;
}
