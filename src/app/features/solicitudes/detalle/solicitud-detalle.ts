import { Component, OnInit, computed, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { SolicitudDetalle as Detalle, SolicitudesService } from '../../../core/services/solicitudes.service';
import { CatalogosService, Opcion } from '../../../core/services/catalogos.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeError } from '../../../core/interceptors/auth.interceptor';
import { claseEstatus } from '../../../shared/archivos';
import { datosAdicionales, datosProceso, titularOrganismo } from './datos-formato';
import { Icono } from '../../../shared/icono/icono';
import { Modal } from '../../../shared/modal/modal';
import { ArchivoPdf } from '../../../shared/archivo-pdf/archivo-pdf';
import { TurnosTab } from './turnos-tab';
import { DocumentosTab } from './documentos-tab';
import { EditarSolicitud } from './editar-solicitud';

type Pestana = 'resumen' | 'peticionario' | 'carpetas' | 'turnos' | 'documentos';
type AccionArchivo = 'negar' | 'resolver' | 'prevenir' | 'opinar' | 'concluir';

interface ConfigAccion {
  titulo: string;
  descripcion: string;
  icono: string;
  boton: string;
  exito: string;
}

const ACCIONES: Record<AccionArchivo, ConfigAccion> = {
  negar: {
    titulo: 'Negar solicitud',
    descripcion: 'Adjunta el documento con la justificación. La solicitud quedará como NO PROCEDE.',
    icono: 'cruzCirculo',
    boton: 'Negar solicitud',
    exito: 'La solicitud se marcó como no procedente.',
  },
  resolver: {
    titulo: 'Registrar resolución',
    descripcion: 'Elige el tipo de resolución y adjunta el documento. La solicitud se terminará y se turnará al Poder Judicial para su conclusión.',
    icono: 'balanza',
    boton: 'Terminar solicitud',
    exito: 'Se registró la resolución.',
  },
  prevenir: {
    titulo: 'Solicitud de prevención',
    descripcion: 'Adjunta el documento con la información que requieres; el Poder Legislativo atenderá la prevención.',
    icono: 'alerta',
    boton: 'Enviar prevención',
    exito: 'Se envió la prevención.',
  },
  opinar: {
    titulo: 'Opinión consultiva',
    descripcion: 'Adjunta el documento con la opinión consultiva de tu institución. Con esto se termina tu turno.',
    icono: 'checkCirculo',
    boton: 'Enviar opinión',
    exito: 'Se registró tu opinión consultiva.',
  },
  concluir: {
    titulo: 'Concluir solicitud',
    descripcion: 'Adjunta el documento de conclusión. La solicitud quedará como CONCLUIDA.',
    icono: 'escudo',
    boton: 'Concluir solicitud',
    exito: 'La solicitud se concluyó.',
  },
};

@Component({
  selector: 'app-solicitud-detalle',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, Icono, Modal, ArchivoPdf, TurnosTab, DocumentosTab, EditarSolicitud],
  templateUrl: './solicitud-detalle.html',
  styleUrl: './solicitud-detalle.scss',
})
export class SolicitudDetalle implements OnInit {
  readonly id = input.required<string>();

  protected readonly solicitud = signal<Detalle | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly pestana = signal<Pestana>('resumen');
  protected readonly editando = signal(false);
  protected readonly claseEstatus = claseEstatus;
  protected readonly datosAdicionales = datosAdicionales;
  protected readonly datosProceso = datosProceso;
  protected readonly titularOrganismo = titularOrganismo;

  // Modal de acciones que llevan documento.
  protected readonly accion = signal<AccionArchivo | null>(null);
  protected readonly configAccion = computed(() => (this.accion() ? ACCIONES[this.accion()!] : null));
  protected readonly archivoAccion = signal<File | null>(null);
  protected readonly recomendaciones = signal<Opcion[]>([]);
  protected recomendacionId = 0;
  protected readonly procesando = signal(false);

  protected readonly pestanas = computed(() => {
    const s = this.solicitud();
    return [
      { id: 'resumen' as const, label: 'Resumen', icono: 'personas' },
      { id: 'peticionario' as const, label: 'Peticionario', icono: 'persona' },
      { id: 'carpetas' as const, label: `Carpetas (${s?.carpetas.length ?? 0})`, icono: 'carpeta' },
      { id: 'turnos' as const, label: s?.acciones.turnar || s?.acciones.editar ? 'Turnos' : 'Asignación', icono: 'enviar' },
      { id: 'documentos' as const, label: 'Documentos', icono: 'documento' },
    ];
  });

  protected readonly hayAcciones = computed(() => {
    const a = this.solicitud()?.acciones;
    return !!a && (a.aceptar || a.negar || a.resolver || a.indicarRecepcion || a.prevenir || a.opinar || a.concluir);
  });

  constructor(
    private readonly solicitudesService: SolicitudesService,
    private readonly catalogosService: CatalogosService,
    private readonly toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  protected numero(): number {
    return Number(this.id());
  }

  cargar(): void {
    this.solicitudesService.detalle(this.numero()).subscribe({
      next: (s) => {
        this.solicitud.set(s);
        this.error.set(null);
      },
      error: (e) => this.error.set(mensajeError(e, 'No se pudo cargar la solicitud.')),
    });
  }

  aceptar(): void {
    this.confirmar(
      '¿Aceptar la solicitud?',
      'La solicitud pasará a EN EVALUACIÓN y podrás turnarla a las instituciones.',
      this.solicitudesService.aceptar(this.numero()),
      'Solicitud aceptada. Ya puedes turnarla.',
      () => this.pestana.set('turnos'),
    );
  }

  indicarRecepcion(): void {
    this.confirmar(
      '¿Indicar recepción?',
      'Confirmas que tu institución recibió la solicitud; tu turno pasará a EN EVALUACIÓN.',
      this.solicitudesService.indicarRecepcion(this.numero()),
      'Se registró la recepción.',
    );
  }

  abrirAccion(accion: AccionArchivo): void {
    this.archivoAccion.set(null);
    this.recomendacionId = 0;
    if (accion === 'resolver' && !this.recomendaciones().length) {
      this.catalogosService.recomendaciones().subscribe((r) => this.recomendaciones.set(r));
    }
    this.accion.set(accion);
  }

  ejecutarAccion(): void {
    const accion = this.accion();
    const archivo = this.archivoAccion();
    if (!accion) return;
    if (!archivo) {
      this.toast.error('Adjunta el documento.');
      return;
    }
    if (accion === 'resolver' && !this.recomendacionId) {
      this.toast.error('Selecciona el tipo de resolución.');
      return;
    }

    const id = this.numero();
    const peticiones: Record<AccionArchivo, () => Observable<void>> = {
      negar: () => this.solicitudesService.negar(id, archivo),
      resolver: () => this.solicitudesService.resolver(id, this.recomendacionId, archivo),
      prevenir: () => this.solicitudesService.prevenir(id, archivo),
      opinar: () => this.solicitudesService.opinar(id, archivo),
      concluir: () => this.solicitudesService.concluir(id, archivo),
    };

    this.procesando.set(true);
    peticiones[accion]().subscribe({
      next: () => {
        this.procesando.set(false);
        this.toast.success(ACCIONES[accion].exito);
        this.accion.set(null);
        this.cargar();
      },
      error: (e) => {
        this.procesando.set(false);
        this.toast.error(mensajeError(e, 'No se pudo completar la acción.'));
      },
    });
  }

  alGuardarEdicion(): void {
    this.editando.set(false);
    this.toast.success('Se actualizaron los datos de la solicitud.');
    this.cargar();
  }

  private confirmar(titulo: string, texto: string, peticion: Observable<void>, exito: string, despues?: () => void): void {
    void Swal.fire({
      title: titulo,
      text: texto,
      icon: 'question',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#960048',
    }).then((r) => {
      if (!r.isConfirmed) return;
      peticion.subscribe({
        next: () => {
          this.toast.success(exito);
          this.cargar();
          despues?.();
        },
        error: (e) => this.toast.error(mensajeError(e, 'No se pudo completar la acción.')),
      });
    });
  }
}
