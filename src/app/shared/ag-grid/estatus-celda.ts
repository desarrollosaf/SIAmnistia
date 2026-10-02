import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { claseEstatus } from '../archivos';

interface FilaConEstatus {
  estatus: string;
  miTurno?: string | null;
}

/** Etiqueta de estatus y, para instituciones, el estado de su propio turno. */
@Component({
  selector: 'app-estatus-celda',
  standalone: true,
  template: `
    <span [class]="clase">{{ estatus }}</span>
    @if (miTurno) {
      <small [class.pendiente]="miTurno === 'PENDIENTE'">{{ miTurno }}</small>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; line-height: 1.25; height: 100%; }
    small { font-size: .68rem; font-weight: 700; color: var(--brand-blue); }
    small.pendiente { color: var(--brand-danger); }
  `],
})
export class EstatusCeldaComponent implements ICellRendererAngularComp {
  protected estatus = '';
  protected clase = '';
  protected miTurno: string | null = null;

  agInit(params: ICellRendererParams<FilaConEstatus>): void {
    this.estatus = params.data?.estatus ?? '';
    this.clase = claseEstatus(this.estatus);
    this.miTurno = params.data?.miTurno ?? null;
  }

  refresh(params: ICellRendererParams<FilaConEstatus>): boolean {
    this.agInit(params);
    return true;
  }
}

/** Semáforo de atención (días en evaluación). */
@Component({
  selector: 'app-semaforo-celda',
  standalone: true,
  template: `
    @if (color) {
      <span class="semaforo" [attr.data-color]="color" [title]="titulos[color]"></span>
    }
  `,
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; height: 100%; }
    .semaforo { width: 18px; height: 18px; border-radius: 50%; box-shadow: 0 0 0 4px rgba(0,0,0,.04); }
    .semaforo[data-color='verde'] { background: #1a8a4a; }
    .semaforo[data-color='amarillo'] { background: #f2c200; }
    .semaforo[data-color='naranja'] { background: #f07c00; }
    .semaforo[data-color='rojo'] { background: #d32f2f; }
  `],
})
export class SemaforoCeldaComponent implements ICellRendererAngularComp {
  protected color: string | null = null;
  protected readonly titulos: Record<string, string> = {
    verde: 'Atendida',
    amarillo: 'En evaluación: hasta 20 días',
    naranja: 'En evaluación: de 21 a 40 días',
    rojo: 'En evaluación: más de 40 días',
  };

  agInit(params: ICellRendererParams<{ semaforo: string | null }>): void {
    this.color = params.data?.semaforo ?? null;
  }

  refresh(params: ICellRendererParams<{ semaforo: string | null }>): boolean {
    this.agInit(params);
    return true;
  }
}
