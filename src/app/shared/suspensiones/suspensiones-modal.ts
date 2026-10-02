import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Modal } from '../modal/modal';
import { Icono } from '../icono/icono';
import { Suspension, SuspensionesService, TipoSuspension } from '../../core/services/suspensiones.service';
import { ToastService } from '../../core/services/toast.service';
import { mensajeError } from '../../core/interceptors/auth.interceptor';

/** Suspensión de términos de una solicitud o de una institución (no corre el plazo de 72 h). */
@Component({
  selector: 'app-suspensiones-modal',
  standalone: true,
  imports: [Modal, Icono, FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal titulo="Suspensión de términos" [subtitulo]="titulo()" icono="pausa" (cerrar)="cerrar.emit()">
      @if (capturando()) {
        <div class="row g-3">
          <div class="col-sm-6">
            <label class="form-label" for="susp-inicio">Fecha de inicio <span class="req">*</span></label>
            <input id="susp-inicio" type="date" class="form-control" [(ngModel)]="fechaInicio" />
          </div>
          <div class="col-sm-6">
            <label class="form-label" for="susp-fin">Fecha de término <span class="req">*</span></label>
            <input id="susp-fin" type="date" class="form-control" [(ngModel)]="fechaFin" [min]="fechaInicio" />
          </div>
          <div class="col-12">
            <label class="form-label" for="susp-just">Justificación <span class="req">*</span></label>
            <input id="susp-just" type="text" class="form-control" maxlength="191" [(ngModel)]="justificacion" />
          </div>
        </div>
      } @else if (cargando()) {
        <p class="hint">Cargando…</p>
      } @else if (!suspensiones().length) {
        <p class="hint">No hay suspensiones registradas.</p>
      } @else {
        <div class="tabla-scroll">
          <table class="tabla">
            <thead>
              <tr><th>Inicio</th><th>Término</th><th>Justificación</th><th></th></tr>
            </thead>
            <tbody>
              @for (s of suspensiones(); track s.id) {
                <tr>
                  <td>{{ s.fechaInicio | date: 'dd/MM/yyyy' }}</td>
                  <td>{{ s.fechaFin | date: 'dd/MM/yyyy' }}</td>
                  <td>{{ s.justificacion }}</td>
                  <td class="text-end">
                    <button type="button" class="icono-btn icono-btn--peligro" (click)="eliminar(s)" aria-label="Eliminar suspensión">
                      <app-icono nombre="basura" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <ng-container modal-pie>
        @if (capturando()) {
          <button type="button" class="btn btn--outline" (click)="capturando.set(false)">Regresar</button>
          <button type="button" class="btn btn--primary" [disabled]="guardando()" (click)="guardar()">
            @if (guardando()) { <span class="spinner"></span> } Guardar
          </button>
        } @else {
          <button type="button" class="btn btn--outline" (click)="cerrar.emit()">Cerrar</button>
          <button type="button" class="btn btn--primary" (click)="nueva()"><app-icono nombre="mas" /> Agregar</button>
        }
      </ng-container>
    </app-modal>
  `,
})
export class SuspensionesModal implements OnInit {
  readonly tipo = input.required<TipoSuspension>();
  readonly registroId = input.required<number>();
  readonly titulo = input('');
  readonly cerrar = output<void>();

  protected readonly suspensiones = signal<Suspension[]>([]);
  protected readonly cargando = signal(true);
  protected readonly capturando = signal(false);
  protected readonly guardando = signal(false);

  protected fechaInicio = '';
  protected fechaFin = '';
  protected justificacion = '';

  constructor(
    private readonly suspensionesService: SuspensionesService,
    private readonly toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  nueva(): void {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.justificacion = '';
    this.capturando.set(true);
  }

  guardar(): void {
    if (!this.fechaInicio || !this.fechaFin || !this.justificacion.trim()) {
      this.toast.error('Llena todos los campos.');
      return;
    }
    this.guardando.set(true);
    this.suspensionesService
      .crear(this.tipo(), this.registroId(), this.fechaInicio, this.fechaFin, this.justificacion)
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.capturando.set(false);
          this.toast.success('Se agregó la suspensión.');
          this.cargar();
        },
        error: (e) => {
          this.guardando.set(false);
          this.toast.error(mensajeError(e, 'No se pudo guardar la suspensión.'));
        },
      });
  }

  eliminar(s: Suspension): void {
    void Swal.fire({
      title: '¿Eliminar la suspensión?',
      text: s.justificacion,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b3261e',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.suspensionesService.eliminar(s.id).subscribe({
        next: () => this.cargar(),
        error: () => this.toast.error('No se pudo eliminar la suspensión.'),
      });
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.suspensionesService.listar(this.tipo(), this.registroId()).subscribe({
      next: (rows) => {
        this.suspensiones.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar las suspensiones.');
      },
    });
  }
}
