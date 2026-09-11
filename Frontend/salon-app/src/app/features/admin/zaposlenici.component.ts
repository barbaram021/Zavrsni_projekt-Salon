import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { concatMap, map, toArray } from 'rxjs/operators';
import { from } from 'rxjs';

import { RadnikOut, UslugaOut } from '../../core/models/api.models';
import { KATEGORIJA_NAZIV, bojaAvatara, inicijali } from '../../core/models/katalog';
import { ObavijestiService } from '../../core/services/obavijesti.service';
import { SalonApiService } from '../../core/services/salon-api.service';
import { porukaGreske } from '../../core/util/greska';
import { UcitavanjeComponent } from '../../shared/ucitavanje.component';

interface RadnikRedak {
  radnik: RadnikOut;
  usluge: UslugaOut[];
  opisUsluga: string;
}

@Component({
  selector: 'app-admin-zaposlenici',
  imports: [ReactiveFormsModule, UcitavanjeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zaposlenici.component.html',
})
export class AdminZaposleniciComponent {
  private readonly api = inject(SalonApiService);
  private readonly fb = inject(FormBuilder);
  private readonly obavijesti = inject(ObavijestiService);

  protected readonly bojaAvatara = bojaAvatara;
  protected readonly inicijali = inicijali;
  protected readonly KATEGORIJA_NAZIV = KATEGORIJA_NAZIV;

  protected readonly ucitavanje = signal(true);
  protected readonly spremanje = signal(false);
  protected readonly otvoreniRadnik = signal<number | null>(null);

  protected readonly usluge = signal<UslugaOut[]>([]);
  private readonly radnici = signal<RadnikOut[]>([]);
  private readonly uslugeRadnika = signal<Map<number, UslugaOut[]>>(new Map());

  /** Usluge koje se dodjeljuju novom radniku pri kreiranju. */
  protected readonly noveUsluge = signal<number[]>([]);

  protected readonly forma = this.fb.nonNullable.group({
    ime: ['', [Validators.required, Validators.maxLength(50)]],
    prezime: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    broj_telefona: ['', [Validators.required, Validators.maxLength(50)]],
    placa: [null as number | null],
  });

  protected readonly redci = computed<RadnikRedak[]>(() => {
    const mapa = this.uslugeRadnika();
    return this.radnici().map((radnik) => {
      const usluge = mapa.get(radnik.korisnik_id) ?? [];
      const kategorije = [
        ...new Set(usluge.map((u) => u.kategorija).filter((k) => k !== null)),
      ];
      return {
        radnik,
        usluge,
        opisUsluga: kategorije.map((k) => KATEGORIJA_NAZIV[k!]).join(' · '),
      };
    });
  });

  constructor() {
    this.ucitaj();
  }

  private ucitaj(): void {
    this.ucitavanje.set(true);
    forkJoin({ radnici: this.api.radnici(), usluge: this.api.usluge() })
      .pipe(
        concatMap(({ radnici, usluge }) =>
          (radnici.length === 0
            ? of([] as { id: number; usluge: UslugaOut[] }[])
            : forkJoin(
                radnici.map((r) =>
                  this.api
                    .uslugeRadnika(r.korisnik_id)
                    .pipe(map((popis) => ({ id: r.korisnik_id, usluge: popis }))),
                ),
              )
          ).pipe(map((veze) => ({ radnici, usluge, veze }))),
        ),
      )
      .subscribe({
        next: ({ radnici, usluge, veze }) => {
          this.radnici.set(radnici);
          this.usluge.set(usluge);
          this.uslugeRadnika.set(new Map(veze.map((v) => [v.id, v.usluge])));
          this.ucitavanje.set(false);
        },
        error: (greska) => {
          this.ucitavanje.set(false);
          this.obavijesti.greska(porukaGreske(greska, 'Zaposlenike nije moguće učitati.'));
        },
      });
  }

  protected prebaciDetalje(radnikId: number): void {
    this.otvoreniRadnik.update((trenutni) => (trenutni === radnikId ? null : radnikId));
  }

  protected imaUslugu(radnikId: number, uslugaId: number): boolean {
    return (this.uslugeRadnika().get(radnikId) ?? []).some((u) => u.usluga_id === uslugaId);
  }

  /** Klik na uslugu dodjeljuje je radniku ili je uklanja — ovisno o trenutnom stanju. */
  protected prebaciUslugu(radnikId: number, usluga: UslugaOut): void {
    if (this.spremanje()) {
      return;
    }
    const dodijeljena = this.imaUslugu(radnikId, usluga.usluga_id);
    this.spremanje.set(true);

    const zahtjev = dodijeljena
      ? this.api.ukloniUslugu(radnikId, usluga.usluga_id)
      : this.api.dodijeliUslugu(radnikId, usluga.usluga_id);

    zahtjev.subscribe({
      next: () => {
        this.spremanje.set(false);
        this.uslugeRadnika.update((mapa) => {
          const nova = new Map(mapa);
          const trenutne = nova.get(radnikId) ?? [];
          nova.set(
            radnikId,
            dodijeljena
              ? trenutne.filter((u) => u.usluga_id !== usluga.usluga_id)
              : [...trenutne, usluga],
          );
          return nova;
        });
      },
      error: (greska) => {
        this.spremanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Promjena usluge nije uspjela.'));
      },
    });
  }

  protected prebaciNovuUslugu(uslugaId: number): void {
    this.noveUsluge.update((popis) =>
      popis.includes(uslugaId) ? popis.filter((id) => id !== uslugaId) : [...popis, uslugaId],
    );
  }

  protected dodajRadnika(): void {
    if (this.forma.invalid || this.spremanje()) {
      this.forma.markAllAsTouched();
      this.obavijesti.greska('Popunite sva obavezna polja (lozinka najmanje 8 znakova).');
      return;
    }

    const podaci = this.forma.getRawValue();
    this.spremanje.set(true);

    this.api
      .stvoriRadnika({
        ...podaci,
        placa: podaci.placa === null || Number.isNaN(podaci.placa) ? null : Number(podaci.placa),
      })
      .pipe(
        concatMap((korisnik) =>
          from(this.noveUsluge()).pipe(
            concatMap((uslugaId) => this.api.dodijeliUslugu(korisnik.korisnik_id, uslugaId)),
            toArray(),
          ),
        ),
      )
      .subscribe({
        next: () => {
          this.spremanje.set(false);
          this.forma.reset({ ime: '', prezime: '', email: '', password: '', broj_telefona: '' });
          this.noveUsluge.set([]);
          this.obavijesti.uspjeh('Zaposlenik je dodan.');
          this.ucitaj();
        },
        error: (greska) => {
          this.spremanje.set(false);
          this.obavijesti.greska(porukaGreske(greska, 'Zaposlenika nije moguće dodati.'));
          this.ucitaj();
        },
      });
  }
}
