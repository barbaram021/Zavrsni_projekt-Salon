import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ObavijestiService } from '../../core/services/obavijesti.service';
import { porukaGreske } from '../../core/util/greska';

type Nacin = 'prijava' | 'registracija';

@Component({
  selector: 'app-prijava',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prijava.component.html',
})
export class PrijavaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly obavijesti = inject(ObavijestiService);

  protected readonly nacin = signal<Nacin>('prijava');
  protected readonly ucitavanje = signal(false);
  protected readonly greska = signal<string | null>(null);

  /** Registracija postoji samo za klijente — backend nudi samo /auth/register za klijenta. */
  protected readonly jeRegistracija = computed(() => this.nacin() === 'registracija');

  protected readonly formaPrijave = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly formaRegistracije = this.fb.nonNullable.group({
    ime: ['', [Validators.required, Validators.maxLength(50)]],
    prezime: ['', [Validators.required, Validators.maxLength(50)]],
    oib: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    broj_telefona: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    potvrda: ['', [Validators.required]],
  });

  protected postaviNacin(nacin: Nacin): void {
    this.nacin.set(nacin);
    this.greska.set(null);
  }

  protected prijavi(): void {
    if (this.formaPrijave.invalid || this.ucitavanje()) {
      this.formaPrijave.markAllAsTouched();
      this.greska.set('Unesite ispravan email i lozinku.');
      return;
    }

    const { email, password } = this.formaPrijave.getRawValue();
    this.ucitavanje.set(true);
    this.greska.set(null);

    this.auth
      .prijava(email, password)
      .pipe(switchMap(() => this.auth.ucitajProfil()))
      .subscribe({
        next: (korisnik) => {
          this.ucitavanje.set(false);
          void this.router.navigate([this.auth.pocetnaRuta(korisnik.uloga)]);
        },
        error: (greska) => {
          this.ucitavanje.set(false);
          this.greska.set(porukaGreske(greska, 'Prijava nije uspjela.'));
        },
      });
  }

  protected registriraj(): void {
    if (this.ucitavanje()) {
      return;
    }

    const podaci = this.formaRegistracije.getRawValue();
    if (this.formaRegistracije.invalid) {
      this.formaRegistracije.markAllAsTouched();
      this.greska.set('Provjerite unesene podatke — OIB mora imati 11 znamenki, lozinka 8 znakova.');
      return;
    }
    if (podaci.password !== podaci.potvrda) {
      this.greska.set('Lozinke se ne podudaraju.');
      return;
    }

    this.ucitavanje.set(true);
    this.greska.set(null);

    const { potvrda: _potvrda, ...zahtjev } = podaci;
    this.auth
      .registracija(zahtjev)
      .pipe(switchMap(() => this.auth.prijava(zahtjev.email, zahtjev.password)))
      .pipe(switchMap(() => this.auth.ucitajProfil()))
      .subscribe({
        next: (korisnik) => {
          this.ucitavanje.set(false);
          this.obavijesti.uspjeh('Račun je kreiran. Dobrodošli!');
          void this.router.navigate([this.auth.pocetnaRuta(korisnik.uloga)]);
        },
        error: (greska) => {
          this.ucitavanje.set(false);
          this.greska.set(porukaGreske(greska, 'Registracija nije uspjela.'));
        },
      });
  }
}
