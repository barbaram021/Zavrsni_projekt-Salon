import { Routes } from '@angular/router';

import { authGuard, ulogaGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'prijava',
    loadComponent: () => import('./features/auth/prijava.component').then((m) => m.PrijavaComponent),
  },
  {
    path: 'rezervacija',
    canActivate: [ulogaGuard('KLIJENT')],
    loadComponent: () =>
      import('./features/klijent/rezervacija.component').then((m) => m.RezervacijaComponent),
  },
  {
    path: 'moje-rezervacije',
    canActivate: [ulogaGuard('KLIJENT')],
    loadComponent: () =>
      import('./features/klijent/moje-rezervacije.component').then(
        (m) => m.MojeRezervacijeComponent,
      ),
  },
  {
    path: 'radnik',
    canActivate: [ulogaGuard('RADNIK')],
    loadComponent: () =>
      import('./features/radnik/raspored.component').then((m) => m.RasporedComponent),
  },
  {
    path: 'admin',
    canActivate: [ulogaGuard('ADMIN')],
    loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/preusmjeri.component').then((m) => m.PreusmjeriComponent),
  },
  { path: '**', redirectTo: '' },
];
