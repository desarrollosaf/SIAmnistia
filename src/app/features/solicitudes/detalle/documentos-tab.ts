import { Component, OnInit, computed, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentoSolicitud, SolicitudesService } from '../../../core/services/solicitudes.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeError } from '../../../core/interceptors/auth.interceptor';
import { abrirArchivo } from '../../../shared/archivos';
import { Icono } from '../../../shared/icono/icono';
import { Modal } from '../../../shared/modal/modal';
import { ArchivoPdf } from '../../../shared/archivo-pdf/archivo-pdf';

/** Expediente digital de la solicitud: documentos del peticionario, generados y de cada institución. */
@Component({
  selector: 'app-documentos-tab',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, Icono, Modal, ArchivoPdf],
  template: `
    <div class="panel">
      <div class="encabezado">
        <h2 class="panel__titulo mb-0"><app-icono nombre="documento" /> Documentos</h2>
        <div class="encabezado__acciones">
          <div class="buscador">
            <app-icono nombre="buscar" />
            <input type="search" class="form-control" placeholder="Buscar documento…" [ngModel]="texto()" (ngModelChange)="texto.set($event)" />
          </div>
          <button type="button" class="btn btn--primary" (click)="abrirCarga()"><app-icono nombre="subir" /> Agregar documento</button>
        </div>
      </div>

      @if (origenes().length > 1) {
        <div class="origenes">
          <button type="button" [class.activo]="origen() === null" (click)="origen.set(null)">Todos</button>
          @for (o of origenes(); track o) {
            <button type="button" [class.activo]="origen() === o" (click)="origen.set(o)">{{ o }}</button>
          }
        </div>
      }

      @if (cargando()) {
        <p class="hint">Cargando documentos…</p>
      } @else if (!filtrados().length) {
        <p class="hint">No hay documentos{{ texto() || origen() ? ' con ese filtro' : '' }}.</p>
      } @else {
        <div class="documentos">
          @for (d of filtrados(); track d.id) {
            <button type="button" class="documento" [class.documento--ficha]="d.fichaTecnica" (click)="abrir(d)" [title]="'Abrir ' + d.nombre">
              <span class="documento__icono"><app-icono nombre="pdf" /></span>
              <span class="documento__texto">
                <strong>{{ d.nombre }}</strong>
                <small>{{ d.descripcion }}</small>
                <small class="documento__meta">{{ d.usuario }} · {{ d.fecha | date: 'dd/MM/yyyy HH:mm' }} · {{ d.tamanoKb | number: '1.0-0' }} KB</small>
              </span>
              <app-icono nombre="ojo" />
            </button>
          }
        </div>
      }
    </div>

    @if (cargandoArchivo()) {
      <app-modal titulo="Agregar documento" icono="subir" (cerrar)="cargandoArchivo.set(false)">
        <div class="mb-3">
          <span class="form-label d-block">Archivo <span class="req">*</span></span>
          <app-archivo-pdf [(archivo)]="archivo" [soloPdf]="false" texto="Seleccionar archivo" />
        </div>
        <label class="form-label" for="doc-desc">Descripción <span class="req">*</span></label>
        <input id="doc-desc" class="form-control mayusculas" maxlength="191" [(ngModel)]="descripcion" />
        <ng-container modal-pie>
          <button type="button" class="btn btn--outline" (click)="cargandoArchivo.set(false)">Cancelar</button>
          <button type="button" class="btn btn--primary" (click)="subir()" [disabled]="subiendo()">
            @if (subiendo()) { <span class="spinner"></span> } Guardar
          </button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: [`
    .encabezado { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .encabezado__acciones { display: flex; flex-wrap: wrap; gap: .6rem; }
    .buscador { position: relative; display: flex; align-items: center; min-width: 240px;
      app-icono { position: absolute; left: .75rem; color: var(--brand-muted); width: 16px; height: 16px; }
      input { padding-left: 2.2rem; } }
    .origenes { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: 1rem;
      button { padding: .35rem .75rem; border: 1.5px solid var(--brand-border); border-radius: 999px; background: #fff;
        font-size: .76rem; font-weight: 700; color: var(--brand-muted); cursor: pointer; }
      button.activo, button:hover { border-color: var(--brand-primary); color: var(--brand-primary); } }
    .documentos { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: .75rem; }
    .documento { display: flex; align-items: center; gap: .8rem; padding: .85rem; border: 1px solid var(--brand-border);
      border-radius: 14px; background: #fff; text-align: left; cursor: pointer; transition: border-color .15s, box-shadow .15s;
      > app-icono { color: var(--brand-muted); }
      &:hover { border-color: var(--brand-primary); box-shadow: 0 8px 20px rgba(150, 0, 72, .08); > app-icono { color: var(--brand-primary); } } }
    .documento--ficha { border-color: rgba(150, 0, 72, .35); background: #fdf6f9; }
    .documento__icono { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
      background: var(--brand-danger-bg); color: var(--brand-danger); }
    .documento__texto { display: flex; flex-direction: column; flex: 1; min-width: 0;
      strong { font-size: .86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      small { font-size: .74rem; color: var(--brand-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
    .documento__meta { margin-top: .15rem; }
  `],
})
export class DocumentosTab implements OnInit {
  readonly solicitudId = input.required<number>();

  protected readonly documentos = signal<DocumentoSolicitud[]>([]);
  protected readonly cargando = signal(true);
  protected readonly texto = signal('');
  protected readonly origen = signal<string | null>(null);
  protected readonly cargandoArchivo = signal(false);
  protected readonly subiendo = signal(false);
  protected readonly archivo = signal<File | null>(null);
  protected descripcion = '';

  /** Quién aportó los documentos (peticionario o cada institución). */
  protected readonly origenes = computed(() => [...new Set(this.documentos().map((d) => d.institucion))]);

  protected readonly filtrados = computed(() => {
    const texto = this.texto().trim().toLowerCase();
    return this.documentos().filter(
      (d) =>
        (!this.origen() || d.institucion === this.origen()) &&
        (!texto || `${d.nombre} ${d.descripcion}`.toLowerCase().includes(texto)),
    );
  });

  constructor(
    private readonly solicitudesService: SolicitudesService,
    private readonly toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  abrir(d: DocumentoSolicitud): void {
    abrirArchivo(this.solicitudesService.archivo(d.uuid), () => this.toast.error('No se pudo abrir el documento.'));
  }

  abrirCarga(): void {
    this.archivo.set(null);
    this.descripcion = '';
    this.cargandoArchivo.set(true);
  }

  subir(): void {
    const archivo = this.archivo();
    if (!archivo || !this.descripcion.trim()) {
      this.toast.error('Selecciona el archivo y captura su descripción.');
      return;
    }
    this.subiendo.set(true);
    this.solicitudesService.subirDocumento(this.solicitudId(), archivo, this.descripcion).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.cargandoArchivo.set(false);
        this.toast.success('Se agregó el documento.');
        this.cargar();
      },
      error: (e) => {
        this.subiendo.set(false);
        this.toast.error(mensajeError(e, 'No se pudo guardar el documento.'));
      },
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.solicitudesService.documentos(this.solicitudId()).subscribe({
      next: (rows) => {
        this.documentos.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los documentos.');
      },
    });
  }
}
