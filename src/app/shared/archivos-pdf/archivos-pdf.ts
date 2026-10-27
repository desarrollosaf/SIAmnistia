import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { Icono } from '../icono/icono';
import { validarPdf } from '../archivos';

let siguienteId = 0;

/** Selector de varios PDF: lista los archivos elegidos (cada uno con su botón para quitarlo) y permite agregar más. */
@Component({
  selector: 'app-archivos-pdf',
  standalone: true,
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lista">
      @for (a of archivos(); track $index) {
        <div class="fila">
          <span class="fila__icono"><app-icono nombre="pdf" /></span>
          <span class="fila__texto">
            <strong>{{ a.name }}</strong>
            <small>{{ (a.size / 1024 / 1024).toFixed(2) }} MB</small>
          </span>
          <button type="button" class="fila__quitar" (click)="quitar($index)" [attr.aria-label]="'Quitar ' + a.name"><app-icono nombre="cruz" /></button>
        </div>
      }
      <input type="file" class="nativo" [id]="id" accept=".pdf,application/pdf" multiple (change)="seleccionar($event)" />
      <label [for]="id" class="agregar" [class.agregar--vacio]="!archivos().length">
        <app-icono nombre="subir" />
        <span>{{ archivos().length ? 'Agregar otro PDF' : texto() }}</span>
      </label>
    </div>
    @if (archivos().length > 1) {
      <small class="aviso">Se enviarán los {{ archivos().length }} archivos comprimidos en un ZIP.</small>
    }
    @if (error()) {
      <small class="error">{{ error() }}</small>
    }
  `,
  styles: [`
    :host { display: block; }
    .lista { display: grid; gap: .5rem; }
    .nativo { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    .fila {
      display: flex; align-items: center; gap: .75rem; padding: .45rem .55rem; border: 1px solid rgba(26, 138, 74, .4);
      border-radius: 12px; background: #f1faf4;
    }
    .fila__icono { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: #fff; color: #1a8a4a; flex-shrink: 0; }
    .fila__texto {
      display: flex; flex-direction: column; flex: 1; min-width: 0;
      strong { font-size: .84rem; color: var(--brand-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      small { font-size: .74rem; color: var(--brand-muted); }
    }
    .fila__quitar {
      display: grid; place-items: center; width: 32px; height: 32px; border: none; border-radius: 8px; background: none;
      color: var(--brand-muted); cursor: pointer;
      &:hover { background: var(--brand-danger-bg); color: var(--brand-danger); }
    }
    .agregar {
      display: flex; align-items: center; justify-content: center; gap: .55rem; min-height: 46px; padding: .5rem; border: 1.5px dashed #cfcdce;
      border-radius: 12px; background: #fafafa; color: var(--brand-primary); font-size: .86rem; font-weight: 700; cursor: pointer;
      &:hover { border-color: var(--brand-primary); }
    }
    .agregar--vacio { min-height: 54px; }
    .aviso { display: block; margin-top: .35rem; font-size: .76rem; color: var(--brand-muted); }
    .error { display: block; margin-top: .3rem; font-size: .76rem; color: var(--brand-danger); }
  `],
})
export class ArchivosPdf {
  readonly archivos = model<File[]>([]);
  readonly texto = input('Seleccionar archivos PDF');

  protected readonly id = `archivos-pdf-${siguienteId++}`;
  protected readonly error = signal<string | null>(null);

  seleccionar(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const elegidos = Array.from(entrada.files ?? []);
    entrada.value = '';
    if (!elegidos.length) return;

    const errores: string[] = [];
    const validos = elegidos.filter((a) => {
      const error = validarPdf(a);
      if (error) errores.push(error);
      return !error;
    });
    // Un mismo archivo no se agrega dos veces (mismo nombre y tamaño).
    const nuevos = validos.filter((a) => !this.archivos().some((x) => x.name === a.name && x.size === a.size));
    this.error.set(errores.length ? errores.join(' ') : null);
    if (nuevos.length) this.archivos.set([...this.archivos(), ...nuevos]);
  }

  protected quitar(indice: number): void {
    this.archivos.set(this.archivos().filter((_, i) => i !== indice));
  }
}
