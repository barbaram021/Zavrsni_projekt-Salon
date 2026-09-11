import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { KategorijaUsluge, UslugaOut } from '../../core/models/api.models';
import { KATEGORIJE } from '../../core/models/katalog';
import { ObavijestiService } from '../../core/services/obavijesti.service';
import { SalonApiService } from '../../core/services/salon-api.service';
import { porukaGreske } from '../../core/util/greska';
import { UcitavanjeComponent } from '../../shared/ucitavanje.component';

/** Duljina stupca za „vrstu” razlikuje se po kategoriji (vidi baza_salon.sql). */
const NAJVISE_ZNAKOVA: Record<KategorijaUsluge, number> = {
  NOKTI: 30,
  DEPILACIJA_VOSKOM: 30,
  TREPAVICE: 30,
  OBRVE: 20,
  SMINKANJE: 30,
};

interface Skupina {
  kategorija: KategorijaUsluge;
  naziv: string;
  usluge: UslugaOut[];
}

@Component({
  selector: 'app-admin-usluge',
  imports: [ReactiveFormsModule, UcitavanjeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usluge.component.html',
})
export class AdminUslugeComponent {
  private readonly api = inject(SalonApiService);
  private readonly fb = inject(FormBuilder);
  private readonly obavijesti = inject(ObavijestiService);

  protected readonly KATEGORIJE = KATEGORIJE;

  protected readonly ucitavanje = signal(true);
  protected readonly spremanje = signal(false);
  protected readonly uUredjivanju = signal<number | null>(null);

  private readonly usluge = signal<UslugaOut[]>([]);

  protected readonly skupine = computed<Skupina[]>(() =>
    KATEGORIJE.map((info) => ({
      kategorija: info.kategorija,
      naziv: info.naziv,
      usluge: this.usluge().filter((u) => u.kategorija === info.kategorija),
    })).filter((skupina) => skupina.usluge.length > 0),
  );

  protected readonly formaNove = this.fb.nonNullable.group({
    kategorija: ['NOKTI' as KategorijaUsluge, [Validators.required]],
    vrsta: ['', [Validators.required]],
    trajanje: [30, [Validators.required, Validators.min(1)]],
    cijena: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly formaIzmjene = this.fb.nonNullable.group({
    vrsta: ['', [Validators.required]],
    trajanje: [30, [Validators.required, Validators.min(1)]],
    cijena: [0, [Validators.required, Validators.min(0)]],
  });

  /** Polje se ograničava atributom maxlength, pa korisnik ne može ni utipkati previše. */
  private readonly odabranaKategorija = toSignal(
    this.formaNove.controls.kategorija.valueChanges,
    { initialValue: this.formaNove.controls.kategorija.value },
  );

  protected readonly granicaNove = computed(() => NAJVISE_ZNAKOVA[this.odabranaKategorija()]);
  protected readonly granicaIzmjene = signal(30);

  constructor() {
    this.ucitaj();
  }

  private ucitaj(): void {
    this.ucitavanje.set(true);
    this.api.usluge().subscribe({
      next: (usluge) => {
        this.usluge.set(usluge);
        this.ucitavanje.set(false);
      },
      error: (greska) => {
        this.ucitavanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Usluge nije moguće učitati.'));
      },
    });
  }

  protected zapocniIzmjenu(usluga: UslugaOut): void {
    this.uUredjivanju.set(usluga.usluga_id);
    this.granicaIzmjene.set(usluga.kategorija ? NAJVISE_ZNAKOVA[usluga.kategorija] : 30);
    this.formaIzmjene.setValue({
      vrsta: usluga.vrsta ?? '',
      trajanje: usluga.trajanje,
      cijena: usluga.cijena,
    });
  }

  protected odustani(): void {
    this.uUredjivanju.set(null);
  }

  protected spremiIzmjenu(uslugaId: number): void {
    if (this.formaIzmjene.invalid || this.spremanje()) {
      this.obavijesti.greska('Provjerite unesene vrijednosti.');
      return;
    }

    this.spremanje.set(true);
    this.api.izmijeniUslugu(uslugaId, this.formaIzmjene.getRawValue()).subscribe({
      next: (azurirana) => {
        this.spremanje.set(false);
        this.uUredjivanju.set(null);
        this.usluge.update((popis) =>
          popis.map((u) => (u.usluga_id === uslugaId ? azurirana : u)),
        );
        this.obavijesti.uspjeh('Usluga je izmijenjena.');
      },
      error: (greska) => {
        this.spremanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Izmjena nije uspjela.'));
      },
    });
  }

  protected obrisi(usluga: UslugaOut): void {
    if (this.spremanje()) {
      return;
    }
    const potvrda = confirm(`Obrisati uslugu „${usluga.vrsta}”?`);
    if (!potvrda) {
      return;
    }

    this.spremanje.set(true);
    this.api.obrisiUslugu(usluga.usluga_id).subscribe({
      next: () => {
        this.spremanje.set(false);
        this.usluge.update((popis) => popis.filter((u) => u.usluga_id !== usluga.usluga_id));
        this.obavijesti.uspjeh('Usluga je obrisana.');
      },
      error: (greska) => {
        this.spremanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Uslugu nije moguće obrisati.'));
      },
    });
  }

  protected dodaj(): void {
    if (this.formaNove.invalid || this.spremanje()) {
      this.formaNove.markAllAsTouched();
      this.obavijesti.greska('Popunite naziv vrste, trajanje i cijenu.');
      return;
    }

    this.spremanje.set(true);
    this.api.stvoriUslugu(this.formaNove.getRawValue()).subscribe({
      next: (nova) => {
        this.spremanje.set(false);
        this.usluge.update((popis) => [...popis, nova]);
        this.formaNove.patchValue({ vrsta: '', trajanje: 30, cijena: 0 });
        this.obavijesti.uspjeh('Usluga je dodana.');
      },
      error: (greska) => {
        this.spremanje.set(false);
        this.obavijesti.greska(porukaGreske(greska, 'Uslugu nije moguće dodati.'));
      },
    });
  }
}
