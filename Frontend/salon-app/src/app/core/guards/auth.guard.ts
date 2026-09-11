import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { Uloga } from '../models/api.models';
import { AuthService } from '../services/auth.service';

/** Propušta samo prijavljene korisnike; profil se dohvaća lijeno (npr. nakon osvježavanja stranice). */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.prijavljen()) {
    return router.createUrlTree(['/prijava']);
  }
  if (auth.korisnik()) {
    return true;
  }
  return auth.ucitajProfil().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/prijava']))),
  );
};

/** Provjerava ulogu; ADMIN smije i ono što smije RADNIK, kao i na backendu. */
export function ulogaGuard(...dozvoljene: Uloga[]): CanActivateFn {
  return (ruta, stanje) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const provjeri = () => {
      const uloga = auth.uloga();
      if (uloga === null) {
        return router.createUrlTree(['/prijava']);
      }
      const smije =
        dozvoljene.includes(uloga) || (uloga === 'ADMIN' && dozvoljene.includes('RADNIK'));
      return smije ? true : router.createUrlTree([auth.pocetnaRuta(uloga)]);
    };

    const osnovni = authGuard(ruta, stanje);
    if (osnovni === true) {
      return provjeri();
    }
    if (typeof osnovni === 'object' && 'pipe' in osnovni) {
      return osnovni.pipe(map((ok) => (ok === true ? provjeri() : ok)));
    }
    return osnovni;
  };
}
