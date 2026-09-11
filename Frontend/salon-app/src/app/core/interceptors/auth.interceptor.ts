import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/** Dodaje Bearer token i odjavljuje korisnika kad token istekne. */
export const authInterceptor: HttpInterceptorFn = (zahtjev, dalje) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const obogacen = token
    ? zahtjev.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : zahtjev;

  return dalje(obogacen).pipe(
    catchError((greska: HttpErrorResponse) => {
      const naPrijavi = zahtjev.url.includes('/auth/login');
      if (greska.status === 401 && token && !naPrijavi) {
        auth.odjava();
      }
      return throwError(() => greska);
    }),
  );
};
