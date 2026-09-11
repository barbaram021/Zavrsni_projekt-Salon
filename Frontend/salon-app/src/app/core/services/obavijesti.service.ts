import { Injectable, signal } from '@angular/core';

export type VrstaObavijesti = 'uspjeh' | 'greska' | 'info';

export interface Obavijest {
  id: number;
  vrsta: VrstaObavijesti;
  poruka: string;
}

@Injectable({ providedIn: 'root' })
export class ObavijestiService {
  private sljedeciId = 1;
  readonly obavijesti = signal<Obavijest[]>([]);

  uspjeh(poruka: string): void {
    this.dodaj('uspjeh', poruka);
  }

  greska(poruka: string): void {
    this.dodaj('greska', poruka);
  }

  info(poruka: string): void {
    this.dodaj('info', poruka);
  }

  zatvori(id: number): void {
    this.obavijesti.update((popis) => popis.filter((o) => o.id !== id));
  }

  private dodaj(vrsta: VrstaObavijesti, poruka: string): void {
    const id = this.sljedeciId++;
    this.obavijesti.update((popis) => [...popis, { id, vrsta, poruka }]);
    setTimeout(() => this.zatvori(id), vrsta === 'greska' ? 6000 : 3500);
  }
}
