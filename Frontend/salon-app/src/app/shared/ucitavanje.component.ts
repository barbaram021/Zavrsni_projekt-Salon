import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ucitavanje',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-center gap-3 py-10 text-[13.5px] text-utisano">
      <span
        class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-rub-jaci border-t-ruza-tamna"
        aria-hidden="true"
      ></span>
      {{ poruka() }}
    </div>
  `,
})
export class UcitavanjeComponent {
  readonly poruka = input('Učitavanje…');
}
