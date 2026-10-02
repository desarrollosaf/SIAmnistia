import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Icono } from '../icono/icono';

export interface AccionCelda<T> {
  icono: string;
  titulo: string;
  peligro?: boolean;
  visible?: (data: T) => boolean;
  onClick: (data: T) => void;
}

export interface AccionesCellRendererParams<T = unknown> extends ICellRendererParams<T> {
  acciones: AccionCelda<T>[];
}

/** Varios botones de icono en una celda (ver, ficha técnica, suspensiones…). */
@Component({
  selector: 'app-acciones-celda',
  standalone: true,
  imports: [Icono],
  template: `
    @for (accion of visibles; track accion.titulo) {
      <button
        type="button"
        class="icono-btn"
        [class.icono-btn--peligro]="accion.peligro"
        [title]="accion.titulo"
        [attr.aria-label]="accion.titulo"
        (click)="accion.onClick(datos)"
      >
        <app-icono [nombre]="accion.icono" />
      </button>
    }
  `,
  styles: [`:host { display: flex; align-items: center; justify-content: center; gap: .35rem; height: 100%; }`],
})
export class AccionesCeldaComponent<T> implements ICellRendererAngularComp {
  protected visibles: AccionCelda<T>[] = [];
  protected datos!: T;

  agInit(params: AccionesCellRendererParams<T>): void {
    this.datos = params.data as T;
    this.visibles = params.acciones.filter((a) => !a.visible || a.visible(this.datos));
  }

  refresh(params: AccionesCellRendererParams<T>): boolean {
    this.agInit(params);
    return true;
  }
}
