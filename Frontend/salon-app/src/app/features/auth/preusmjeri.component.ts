import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/** Prazna ruta „/” — šalje korisnika na dio aplikacije koji pripada njegovoj ulozi. */
@Component({
  selector: 'app-preusmjeri',
  template: '',
})
export class PreusmjeriComponent {
  constructor() {
    const auth = inject(AuthService);
    const router = inject(Router);
    const uloga = auth.uloga();
    void router.navigate([uloga ? auth.pocetnaRuta(uloga) : '/prijava']);
  }
}
