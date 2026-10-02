import { Component, ElementRef, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import { AuthService } from '../../../core/services/auth.service';
import { ResumenSolicitudes, SolicitudesService, SolicitudListado } from '../../../core/services/solicitudes.service';
import { ToastService } from '../../../core/services/toast.service';
import { AG_GRID_LOCALE, gridTheme } from '../../../shared/ag-grid/ag-grid-setup';
import { AccionesCeldaComponent, AccionCelda } from '../../../shared/ag-grid/acciones-celda';
import { EstatusCeldaComponent, SemaforoCeldaComponent } from '../../../shared/ag-grid/estatus-celda';
import { habilitarArrastreHorizontal } from '../../../shared/ag-grid/arrastre-horizontal';
import { abrirArchivo, descargarBlob } from '../../../shared/archivos';
import { Icono } from '../../../shared/icono/icono';
import { SuspensionesModal } from '../../../shared/suspensiones/suspensiones-modal';


@Component({
  selector: 'app-solicitudes-lista',
  standalone: true,
  imports: [FormsModule, AgGridAngular, Icono, SuspensionesModal],
  templateUrl: './solicitudes-lista.html',
  styleUrl: './solicitudes-lista.scss',
})
export class SolicitudesLista {
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly solicitudes = signal<SolicitudListado[]>([]);
  protected readonly resumen = signal<ResumenSolicitudes | null>(null);
  protected readonly filtro = signal(0);
  protected readonly busqueda = signal('');
  protected readonly descargando = signal(false);
  protected readonly suspension = signal<SolicitudListado | null>(null);
  protected readonly esLegislativo;

  protected readonly gridTheme = gridTheme;
  protected readonly localeText = AG_GRID_LOCALE;

  protected readonly filtros = computed(() => [
    { id: 0, nombre: 'Todas', total: this.resumen()?.total ?? null },
    ...(this.resumen()?.estatus ?? []).map((e) => ({ id: e.id, nombre: e.nombre, total: e.total })),
  ]);

  protected readonly columnas: ColDef<SolicitudListado>[];
  // Filas de alto fijo con el contenido centrado (nombres largos se cortan y muestran tooltip).
  protected readonly defaultColDef: ColDef<SolicitudListado> = {
    cellStyle: { lineHeight: '62px' },
  };

  constructor(
    private readonly solicitudesService: SolicitudesService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly elementRef: ElementRef<HTMLElement>,
    route: ActivatedRoute,
    auth: AuthService,
  ) {
    this.esLegislativo = auth.esLegislativo;
    const legislativo = auth.esLegislativo();

    const acciones: AccionCelda<SolicitudListado>[] = [
      { icono: 'ojo', titulo: 'Ver solicitud', onClick: (s) => void this.router.navigate(['/solicitudes', s.id]) },
      { icono: 'pdf', titulo: 'Ficha técnica', visible: (s) => !!s.fichaUuid, onClick: (s) => this.verFicha(s) },
    ];
    if (legislativo) {
      acciones.push(
        { icono: 'pausa', titulo: 'Suspensión de términos', onClick: (s) => this.suspension.set(s) },
        { icono: 'copias', titulo: 'Regenerar acuse y ficha técnica', onClick: (s) => this.regenerar(s) },
      );
    }

    this.columnas = [
      { field: 'nus', headerName: 'NUS', width: 105, pinned: 'left', comparator: (a, b) => this.compararNus(a, b) },
      { field: 'beneficiario', headerName: 'Beneficiario', minWidth: 220, flex: 1.4, tooltipField: 'beneficiario' },
      { field: 'solicitante', headerName: 'Peticionario', minWidth: 200, flex: 1.2, tooltipField: 'solicitante' },
      { field: 'estatus', headerName: 'Estatus', width: 200, cellStyle: { display: 'flex', justifyContent: 'center' }, cellRenderer: EstatusCeldaComponent },
      { field: 'semaforo', headerName: 'Semáforo', width: 105, cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center' }, cellRenderer: SemaforoCeldaComponent, sortable: false, filter: false },
      {
        headerName: 'Acciones',
        width: legislativo ? 190 : 110,
        pinned: 'right',
        sortable: false,
        filter: false,
        resizable: false,
        cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
        cellRenderer: AccionesCeldaComponent,
        cellRendererParams: { acciones },
      },
    ];

    this.filtro.set(Number(route.snapshot.queryParamMap.get('estatus')) || 0);
    this.cargarResumen();
    this.cargar();
  }

  onGridReady(): void {
    habilitarArrastreHorizontal(this.elementRef.nativeElement);
  }

  filtrar(id: number): void {
    if (this.filtro() === id) return;
    this.filtro.set(id);
    void this.router.navigate([], { queryParams: { estatus: id || null }, replaceUrl: true });
    this.cargar();
  }

  descargarExcel(): void {
    this.descargando.set(true);
    this.solicitudesService.excel().subscribe({
      next: (blob) => {
        this.descargando.set(false);
        descargarBlob(blob, `solicitudes-${new Date().toISOString().slice(0, 10)}.xlsx`);
      },
      error: () => {
        this.descargando.set(false);
        this.toast.error('No se pudo generar el archivo de Excel.');
      },
    });
  }

  private verFicha(s: SolicitudListado): void {
    abrirArchivo(this.solicitudesService.archivo(s.fichaUuid!), () => this.toast.error('No se pudo abrir la ficha técnica.'));
  }

  private regenerar(s: SolicitudListado): void {
    void Swal.fire({
      title: '¿Regenerar documentos?',
      text: `Se generará un acuse y una ficha técnica nuevos para la solicitud ${s.nus} y se reenviará el acuse al peticionario.`,
      icon: 'question',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, regenerar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#960048',
      showLoaderOnConfirm: true,
      preConfirm: () =>
        new Promise<boolean>((resolve) => {
          this.solicitudesService.regenerarDocumentos(s.id).subscribe({
            next: () => resolve(true),
            error: () => {
              Swal.showValidationMessage('No se pudieron regenerar los documentos.');
              resolve(false);
            },
          });
        }),
    }).then((r) => {
      if (r.isConfirmed && r.value) {
        this.toast.success(`Documentos de la solicitud ${s.nus} regenerados.`);
        this.cargar();
      }
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.solicitudesService.listar(this.filtro()).subscribe({
      next: (rows) => {
        this.solicitudes.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las solicitudes.');
        this.cargando.set(false);
      },
    });
  }

  private cargarResumen(): void {
    this.solicitudesService.resumen().subscribe({ next: (r) => this.resumen.set(r) });
  }

  /** Ordena "folio/año" por año y luego por folio. */
  private compararNus(a: string, b: string): number {
    const [fa, aa] = a.split('/').map(Number);
    const [fb, ab] = b.split('/').map(Number);
    return aa - ab || fa - fb;
  }
}
