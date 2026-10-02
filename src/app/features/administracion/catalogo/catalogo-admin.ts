import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { AdministracionService, FilaCatalogo } from '../../../core/services/administracion.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeError } from '../../../core/interceptors/auth.interceptor';
import { Icono } from '../../../shared/icono/icono';
import { Modal } from '../../../shared/modal/modal';
import { SuspensionesModal } from '../../../shared/suspensiones/suspensiones-modal';

export interface CampoCatalogo {
  clave: string;
  etiqueta: string;
  tipo: 'texto' | 'email' | 'numero' | 'select' | 'textarea';
  /** Recurso de administración del que salen las opciones del select. */
  opciones?: string;
  mayusculas?: boolean;
}

export interface ConfigCatalogo {
  titulo: string;
  descripcion: string;
  recurso: string;
  singular: string;
  columnas: { campo: string; titulo: string; numero?: boolean }[];
  campos: CampoCatalogo[];
  sinAlta?: boolean;
  sinBaja?: boolean;
  /** Permite capturar suspensiones de términos por registro (instituciones). */
  suspensiones?: boolean;
}

type Valor = string | number | null;

/** Pantalla genérica de alta, edición y baja para los catálogos de administración. */
@Component({
  selector: 'app-catalogo-admin',
  standalone: true,
  imports: [FormsModule, Icono, Modal, SuspensionesModal],
  templateUrl: './catalogo-admin.html',
})
export class CatalogoAdmin {
  protected readonly config: ConfigCatalogo;
  protected readonly filas = signal<FilaCatalogo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly busqueda = signal('');
  protected readonly editando = signal<FilaCatalogo | 'nuevo' | null>(null);
  protected readonly guardando = signal(false);
  protected readonly opciones = signal<Record<string, { id: number; nombre: string }[]>>({});
  protected readonly suspension = signal<FilaCatalogo | null>(null);
  protected valores: Record<string, Valor> = {};

  protected readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.filas();
    return this.filas().filter((f) =>
      this.config.columnas.some((c) => String(f[c.campo] ?? '').toLowerCase().includes(texto)),
    );
  });

  constructor(
    route: ActivatedRoute,
    private readonly admin: AdministracionService,
    private readonly toast: ToastService,
  ) {
    this.config = route.snapshot.data['config'] as ConfigCatalogo;
    this.cargar();
    for (const campo of this.config.campos.filter((c) => c.opciones)) {
      this.admin.listar(campo.opciones!).subscribe((rows) =>
        this.opciones.update((o) => ({
          ...o,
          [campo.opciones!]: rows.map((r) => ({ id: r.id, nombre: String(r['delito'] ?? r['nombre'] ?? r.id) })),
        })),
      );
    }
  }

  protected tituloModal(): string {
    return this.editando() === 'nuevo' ? `Agregar ${this.config.singular}` : `Editar ${this.config.singular}`;
  }

  nuevo(): void {
    this.valores = Object.fromEntries(this.config.campos.map((c) => [c.clave, c.tipo === 'select' ? 0 : '']));
    this.editando.set('nuevo');
  }

  editar(fila: FilaCatalogo): void {
    this.valores = Object.fromEntries(this.config.campos.map((c) => [c.clave, (fila[c.clave] as Valor) ?? '']));
    this.editando.set(fila);
  }

  guardar(): void {
    const faltante = this.config.campos.find((c) => {
      const v = this.valores[c.clave];
      return v === '' || v === null || v === 0;
    });
    if (faltante) {
      this.toast.error(`Captura: ${faltante.etiqueta.toLowerCase()}.`);
      return;
    }
    const actual = this.editando();
    const id = actual && actual !== 'nuevo' ? actual.id : undefined;
    const datos = Object.fromEntries(
      this.config.campos.map((c) => [c.clave, c.tipo === 'select' || c.tipo === 'numero' ? Number(this.valores[c.clave]) : String(this.valores[c.clave]).trim()]),
    );

    this.guardando.set(true);
    this.admin.guardar(this.config.recurso, datos, id).subscribe({
      next: () => {
        this.guardando.set(false);
        this.editando.set(null);
        this.toast.success(`Se guardó ${this.config.singular === 'institución' || this.config.singular === 'modalidad' ? 'la' : 'el'} ${this.config.singular}.`);
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.toast.error(mensajeError(e, 'No se pudo guardar.'));
      },
    });
  }

  eliminar(fila: FilaCatalogo): void {
    const nombre = String(fila[this.config.columnas[0].campo] ?? '');
    void Swal.fire({
      title: `¿Eliminar ${this.config.singular}?`,
      text: nombre,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b3261e',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.admin.eliminar(this.config.recurso, fila.id).subscribe({
        next: () => {
          this.toast.success('Registro eliminado.');
          this.cargar();
        },
        error: (e) => this.toast.error(mensajeError(e, 'No se pudo eliminar.')),
      });
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.admin.listar(this.config.recurso).subscribe({
      next: (rows) => {
        this.filas.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar el catálogo.');
      },
    });
  }
}
