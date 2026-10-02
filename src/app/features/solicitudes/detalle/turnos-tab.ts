import { Component, OnInit, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SolicitudesService, Turno } from '../../../core/services/solicitudes.service';
import { CatalogosService, Opcion, UsuarioInstitucion } from '../../../core/services/catalogos.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeError } from '../../../core/interceptors/auth.interceptor';
import { claseEstatus } from '../../../shared/archivos';
import { Icono } from '../../../shared/icono/icono';
import { Modal } from '../../../shared/modal/modal';
import { ArchivoPdf } from '../../../shared/archivo-pdf/archivo-pdf';

/** Instituciones a las que se turnó la solicitud; el Legislativo turna, retira y atiende prevenciones. */
@Component({
  selector: 'app-turnos-tab',
  standalone: true,
  imports: [DatePipe, FormsModule, Icono, Modal, ArchivoPdf],
  template: `
    @if (puedeTurnar()) {
      <div class="panel">
        <h2 class="panel__titulo"><app-icono nombre="enviar" /> Turnar a una institución</h2>
        <div class="row g-3 align-items-end">
          <div class="col-md-5">
            <label class="form-label" for="t-inst">Institución</label>
            <select id="t-inst" class="form-select" [ngModel]="institucionId()" (ngModelChange)="elegirInstitucion($event)">
              <option [ngValue]="0">Selecciona una opción</option>
              @for (i of instituciones(); track i.id) { <option [ngValue]="i.id">{{ i.nombre }}</option> }
            </select>
          </div>
          <div class="col-md-5">
            <label class="form-label" for="t-usuario">Usuario</label>
            <select id="t-usuario" class="form-select" [(ngModel)]="usuarioId" [disabled]="!usuarios().length">
              <option [ngValue]="0">{{ institucionId() && !usuarios().length ? 'La institución no tiene usuarios' : 'Selecciona una opción' }}</option>
              @for (u of usuarios(); track u.id) { <option [ngValue]="u.id">{{ u.nombre }} · {{ u.email }}</option> }
            </select>
          </div>
          <div class="col-md-2">
            <button type="button" class="btn btn--primary w-100" (click)="turnar()" [disabled]="guardando()">
              @if (guardando()) { <span class="spinner"></span> } @else { <app-icono nombre="mas" /> } Turnar
            </button>
          </div>
        </div>
        <p class="form-text mt-2">Se enviará un correo al usuario. Tiene 72 horas para indicar la recepción; después se tendrá por recibida.</p>
      </div>
    }

    <div class="panel">
      <h2 class="panel__titulo"><app-icono nombre="personas" /> {{ legislativo() ? 'Instituciones turnadas' : 'Asignaciones' }}</h2>
      @if (cargando()) {
        <p class="hint">Cargando…</p>
      } @else if (!turnos().length) {
        <p class="hint">La solicitud aún no se ha turnado.</p>
      } @else {
        <div class="tabla-scroll">
          <table class="tabla">
            <thead>
              <tr>
                <th>Institución / usuario</th>
                <th>Estatus</th>
                <th>Recomendación</th>
                <th>Turnada</th>
                <th>Recepción</th>
                <th>Término</th>
                @if (legislativo()) { <th></th> }
              </tr>
            </thead>
            <tbody>
              @for (t of turnos(); track t.id) {
                <tr>
                  <td><strong>{{ t.institucion }}</strong><br /><small class="hint">{{ t.usuario }}</small></td>
                  <td>
                    <span [class]="claseEstatus(t.estatus)">{{ t.estatus }}</span>
                    @if (t.prevencion && t.estatus !== 'PREVENCIÓN') { <br /><small class="hint">Con prevención atendida</small> }
                  </td>
                  <td>{{ t.recomendacion }}</td>
                  <td>{{ t.fechaTurno | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ t.fechaEvaluacion ? (t.fechaEvaluacion | date: 'dd/MM/yyyy HH:mm') : '—' }}</td>
                  <td>{{ t.fechaTermino ? (t.fechaTermino | date: 'dd/MM/yyyy HH:mm') : '—' }}</td>
                  @if (legislativo()) {
                    <td class="text-end text-nowrap">
                      @if (t.estatus === 'PREVENCIÓN') {
                        <button type="button" class="btn btn--outline btn--sm me-1" (click)="abrirRespuesta(t)"><app-icono nombre="subir" /> Responder</button>
                      }
                      <button type="button" class="icono-btn icono-btn--peligro" (click)="quitar(t)" title="Quitar turno" aria-label="Quitar turno"><app-icono nombre="basura" /></button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (respondiendo(); as t) {
      <app-modal titulo="Respuesta a prevención" [subtitulo]="t.institucion" icono="subir" (cerrar)="respondiendo.set(null)">
        <p class="hint mb-3">Adjunta el documento con la respuesta. El turno regresará a EN EVALUACIÓN.</p>
        <app-archivo-pdf [(archivo)]="archivoRespuesta" />
        <ng-container modal-pie>
          <button type="button" class="btn btn--outline" (click)="respondiendo.set(null)">Cancelar</button>
          <button type="button" class="btn btn--primary" (click)="responder()" [disabled]="guardando()">
            @if (guardando()) { <span class="spinner"></span> } Enviar respuesta
          </button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: [`:host { display: flex; flex-direction: column; gap: 1.5rem; } td small { font-size: .76rem; }`],
})
export class TurnosTab implements OnInit {
  readonly solicitudId = input.required<number>();
  readonly puedeTurnar = input(false);
  readonly legislativo = input(false);
  readonly cambio = output<void>();

  protected readonly turnos = signal<Turno[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly instituciones = signal<Opcion[]>([]);
  protected readonly institucionId = signal(0);
  protected readonly usuarios = signal<UsuarioInstitucion[]>([]);
  protected usuarioId = 0;
  protected readonly respondiendo = signal<Turno | null>(null);
  protected readonly archivoRespuesta = signal<File | null>(null);
  protected readonly claseEstatus = claseEstatus;

  constructor(
    private readonly solicitudesService: SolicitudesService,
    private readonly catalogosService: CatalogosService,
    private readonly toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    if (this.puedeTurnar()) {
      this.catalogosService.instituciones().subscribe((rows) => this.instituciones.set(rows));
    }
  }

  elegirInstitucion(id: number): void {
    this.institucionId.set(id);
    this.usuarioId = 0;
    this.usuarios.set([]);
    if (id) this.catalogosService.usuariosInstitucion(id).subscribe((rows) => this.usuarios.set(rows));
  }

  turnar(): void {
    if (!this.usuarioId) {
      this.toast.error('Selecciona la institución y el usuario.');
      return;
    }
    this.guardando.set(true);
    this.solicitudesService.turnar(this.solicitudId(), this.usuarioId).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toast.success('Se turnó la solicitud.');
        this.elegirInstitucion(0);
        this.cargar();
        this.cambio.emit();
      },
      error: (e) => {
        this.guardando.set(false);
        this.toast.error(mensajeError(e, 'No se pudo turnar la solicitud.'));
      },
    });
  }

  quitar(t: Turno): void {
    void Swal.fire({
      title: '¿Quitar el turno?',
      text: `${t.institucion} dejará de ver esta solicitud.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b3261e',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.solicitudesService.quitarTurno(this.solicitudId(), t.id).subscribe({
        next: () => {
          this.toast.success('Se quitó el turno.');
          this.cargar();
        },
        error: (e) => this.toast.error(mensajeError(e, 'No se pudo quitar el turno.')),
      });
    });
  }

  abrirRespuesta(t: Turno): void {
    this.archivoRespuesta.set(null);
    this.respondiendo.set(t);
  }

  responder(): void {
    const t = this.respondiendo();
    const archivo = this.archivoRespuesta();
    if (!t || !archivo) {
      this.toast.error('Adjunta el documento de respuesta.');
      return;
    }
    this.guardando.set(true);
    this.solicitudesService.responderPrevencion(this.solicitudId(), t.id, archivo).subscribe({
      next: () => {
        this.guardando.set(false);
        this.respondiendo.set(null);
        this.toast.success('Se envió la respuesta a la prevención.');
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.toast.error(mensajeError(e, 'No se pudo enviar la respuesta.'));
      },
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.solicitudesService.turnos(this.solicitudId()).subscribe({
      next: (rows) => {
        this.turnos.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los turnos.');
      },
    });
  }
}
