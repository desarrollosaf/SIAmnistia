import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { Icono } from '../icono/icono';
import { validarPdf } from '../archivos';

let siguienteId = 0;

/** Selector de un solo archivo (PDF por defecto) con nombre, tamaño y botón para quitarlo. */
@Component({
  selector: 'app-archivo-pdf',
  standalone: true,
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="archivo" [class.archivo--lleno]="archivo()" [class.archivo--invalido]="invalido() && !archivo()">
      <input type="file" class="archivo__nativo" [id]="id" [accept]="soloPdf() ? '.pdf,application/pdf' : ''" (change)="seleccionar($event)" />
      @if (archivo(); as a) {
        <span class="archivo__icono"><app-icono nombre="pdf" /></span>
        <span class="archivo__texto">
          <strong>{{ a.name }}</strong>
          <small>{{ (a.size / 1024 / 1024).toFixed(2) }} MB</small>
        </span>
        <button type="button" class="archivo__quitar" (click)="archivo.set(null)" [attr.aria-label]="'Quitar ' + a.name">
          <app-icono nombre="cruz" />
        </button>
      } @else {
        <label [for]="id" class="archivo__boton">
          <app-icono nombre="subir" />
          <span>{{ texto() }}</span>
        </label>
      }
    </div>
    @if (error()) {
      <small class="archivo__error">{{ error() }}</small>
    }
  `,
  styles: [`
    :host { display: block; }
    .archivo {
      position: relative; display: flex; align-items: center; gap: .75rem; min-height: 54px; padding: .45rem .55rem;
      border: 1.5px dashed #cfcdce; border-radius: 12px; background: #fafafa; transition: border-color .15s, background .15s;
      &:hover { border-color: var(--brand-primary); }
    }
    .archivo--lleno { border-style: solid; border-color: rgba(26, 138, 74, .4); background: #f1faf4; }
    .archivo--invalido { border-color: var(--brand-danger); background: var(--brand-danger-bg); }
    .archivo__nativo { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    .archivo__boton {
      display: flex; align-items: center; justify-content: center; gap: .55rem; width: 100%; padding: .55rem;
      color: var(--brand-primary); font-size: .86rem; font-weight: 700; cursor: pointer;
    }
    .archivo__icono { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: #fff; color: #1a8a4a; flex-shrink: 0; }
    .archivo__texto {
      display: flex; flex-direction: column; flex: 1; min-width: 0;
      strong { font-size: .84rem; color: var(--brand-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      small { font-size: .74rem; color: var(--brand-muted); }
    }
    .archivo__quitar {
      display: grid; place-items: center; width: 32px; height: 32px; border: none; border-radius: 8px;
      background: none; color: var(--brand-muted); cursor: pointer;
      &:hover { background: var(--brand-danger-bg); color: var(--brand-danger); }
    }
    .archivo__error { display: block; margin-top: .3rem; font-size: .76rem; color: var(--brand-danger); }
  `],
})
export class ArchivoPdf {
  readonly archivo = model<File | null>(null);
  readonly texto = input('Seleccionar archivo PDF');
  readonly soloPdf = input(true);
  readonly invalido = input(false);

  protected readonly id = `archivo-pdf-${siguienteId++}`;
  protected readonly error = signal<string | null>(null);

  seleccionar(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    if (!archivo) return;

    const error = this.soloPdf() ? validarPdf(archivo) : null;
    this.error.set(error);
    if (!error) this.archivo.set(archivo);
  }
}
