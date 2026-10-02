import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SolicitudDetalle, SolicitudesService } from '../../../core/services/solicitudes.service';
import { CatalogosService, Opcion } from '../../../core/services/catalogos.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeError } from '../../../core/interceptors/auth.interceptor';
import { Modal } from '../../../shared/modal/modal';

/** Corrección de datos capturados por el peticionario (solo Poder Legislativo). */
@Component({
  selector: 'app-editar-solicitud',
  standalone: true,
  imports: [ReactiveFormsModule, Modal],
  template: `
    <app-modal titulo="Editar datos de la solicitud" [subtitulo]="'Solicitud ' + solicitud().nus" icono="lapiz" ancho="ancho" (cerrar)="cerrar.emit()">
      <form [formGroup]="form" class="row g-3">
        <h3 class="seccion">Beneficiario</h3>
        <div class="col-md-4"><label class="form-label">Nombre(s)</label><input class="form-control mayusculas" formControlName="beneficiarioNombre" /></div>
        <div class="col-md-4"><label class="form-label">Primer apellido</label><input class="form-control mayusculas" formControlName="beneficiarioPrimerApellido" /></div>
        <div class="col-md-4"><label class="form-label">Segundo apellido</label><input class="form-control mayusculas" formControlName="beneficiarioSegundoApellido" /></div>
        <div class="col-md-4"><label class="form-label">Fecha de nacimiento</label><input type="date" class="form-control" formControlName="beneficiarioFechaNacimiento" /></div>
        <div class="col-md-4"><label class="form-label">CURP</label><input class="form-control mayusculas" maxlength="18" formControlName="beneficiarioCurp" /></div>

        <h3 class="seccion">Peticionario</h3>
        <div class="col-md-4"><label class="form-label">{{ fisica ? 'Nombre(s)' : 'Institución u organismo' }}</label><input class="form-control mayusculas" formControlName="solicitanteNombre" /></div>
        @if (fisica) {
          <div class="col-md-4"><label class="form-label">Primer apellido</label><input class="form-control mayusculas" formControlName="solicitantePrimerApellido" /></div>
          <div class="col-md-4"><label class="form-label">Segundo apellido</label><input class="form-control mayusculas" formControlName="solicitanteSegundoApellido" /></div>
        }
        <div class="col-md-4"><label class="form-label">Correo electrónico</label><input type="email" class="form-control" formControlName="solicitanteEmail" /></div>
        <div class="col-md-4"><label class="form-label">Teléfono</label><input class="form-control" maxlength="10" formControlName="solicitanteTelefono" /></div>
        <div class="col-md-4"><label class="form-label">Celular</label><input class="form-control" maxlength="10" formControlName="solicitanteCelular" /></div>

        <h3 class="seccion">Domicilio del peticionario</h3>
        <div class="col-md-6"><label class="form-label">Calle</label><input class="form-control mayusculas" formControlName="calle" /></div>
        <div class="col-6 col-md-3"><label class="form-label">Núm. exterior</label><input class="form-control mayusculas" formControlName="numExt" /></div>
        <div class="col-6 col-md-3"><label class="form-label">Núm. interior</label><input class="form-control mayusculas" formControlName="numInt" /></div>
        <div class="col-md-4"><label class="form-label">Colonia</label><input class="form-control mayusculas" formControlName="colonia" /></div>
        <div class="col-md-4">
          <label class="form-label">Entidad</label>
          <select class="form-select" formControlName="entidadId" (change)="cargarMunicipios(true)">
            @for (e of entidades(); track e.id) { <option [ngValue]="e.id">{{ e.nombre }}</option> }
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">Municipio</label>
          <select class="form-select" formControlName="municipioId">
            <option [ngValue]="null">Selecciona una opción</option>
            @for (m of municipios(); track m.id) { <option [ngValue]="m.id">{{ m.nombre }}</option> }
          </select>
        </div>

        <h3 class="seccion">Solicitud</h3>
        <div class="col-md-6"><label class="form-label">CPRS</label><input class="form-control mayusculas" formControlName="cprs" /></div>
        <div class="col-md-6"><label class="form-label">Juzgado</label><input class="form-control mayusculas" formControlName="juzgado" /></div>
        <div class="col-12">
          <label class="form-check"><input type="checkbox" class="form-check-input" formControlName="procedimientoAbreviado" /> <span class="form-check-label">Procedimiento abreviado</span></label>
        </div>
      </form>
      <ng-container modal-pie>
        <button type="button" class="btn btn--outline" (click)="cerrar.emit()">Cancelar</button>
        <button type="button" class="btn btn--primary" (click)="guardar()" [disabled]="guardando()">
          @if (guardando()) { <span class="spinner"></span> } Guardar cambios
        </button>
      </ng-container>
    </app-modal>
  `,
  styles: [`.seccion { margin: .75rem 0 -.25rem; font-size: .78rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--brand-primary); } .seccion:first-child { margin-top: 0; }`],
})
export class EditarSolicitud implements OnInit {
  readonly solicitud = input.required<SolicitudDetalle>();
  readonly cerrar = output<void>();
  readonly guardado = output<void>();

  protected readonly entidades = signal<Opcion[]>([]);
  protected readonly municipios = signal<Opcion[]>([]);
  protected readonly guardando = signal(false);
  protected fisica = true;
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    beneficiarioNombre: ['', Validators.required],
    beneficiarioPrimerApellido: ['', Validators.required],
    beneficiarioSegundoApellido: [''],
    beneficiarioFechaNacimiento: [''],
    beneficiarioCurp: [''],
    solicitanteNombre: ['', Validators.required],
    solicitantePrimerApellido: [''],
    solicitanteSegundoApellido: [''],
    solicitanteEmail: ['', Validators.email],
    solicitanteTelefono: [''],
    solicitanteCelular: [''],
    calle: [''],
    numExt: [''],
    numInt: [''],
    colonia: [''],
    entidadId: [null as number | null],
    municipioId: [null as number | null],
    cprs: ['', Validators.required],
    juzgado: ['', Validators.required],
    procedimientoAbreviado: [false],
  });

  constructor(
    private readonly solicitudesService: SolicitudesService,
    private readonly catalogosService: CatalogosService,
    private readonly toast: ToastService,
  ) {}

  ngOnInit(): void {
    const s = this.solicitud();
    const d = s.solicitante.domicilio;
    this.fisica = s.solicitante.personaFisica;
    this.form.patchValue({
      beneficiarioNombre: s.beneficiario.nombre,
      beneficiarioPrimerApellido: s.beneficiario.primerApellido,
      beneficiarioSegundoApellido: s.beneficiario.segundoApellido ?? '',
      beneficiarioFechaNacimiento: s.beneficiario.fechaNacimiento ?? '',
      beneficiarioCurp: s.beneficiario.curp ?? '',
      solicitanteNombre: s.solicitante.nombre,
      solicitantePrimerApellido: s.solicitante.primerApellido ?? '',
      solicitanteSegundoApellido: s.solicitante.segundoApellido ?? '',
      solicitanteEmail: s.solicitante.email ?? '',
      solicitanteTelefono: s.solicitante.telefono ?? '',
      solicitanteCelular: s.solicitante.celular ?? '',
      calle: d?.calle ?? '',
      numExt: d?.numExt ?? '',
      numInt: d?.numInt ?? '',
      colonia: d?.colonia ?? '',
      entidadId: d?.entidadId ?? null,
      municipioId: d?.municipioId ?? null,
      cprs: s.detalle.cprs,
      juzgado: s.detalle.juzgado,
      procedimientoAbreviado: s.detalle.procedimientoAbreviado,
    });
    this.catalogosService.formulario().subscribe((c) => this.entidades.set(c.entidades));
    this.cargarMunicipios(false);
  }

  cargarMunicipios(reiniciar: boolean): void {
    const entidad = this.form.controls.entidadId.value;
    if (reiniciar) this.form.controls.municipioId.setValue(null);
    if (entidad) this.catalogosService.municipios(entidad).subscribe((m) => this.municipios.set(m));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Revisa los campos obligatorios.');
      return;
    }
    const v = this.form.getRawValue();
    const datos: Record<string, string | number | boolean | null | undefined> = { ...v };
    // Vacíos se omiten para no borrar datos opcionales por accidente.
    Object.keys(datos).forEach((k) => {
      if (datos[k] === '' || datos[k] === null) delete datos[k];
    });
    if (!this.fisica) {
      delete datos['solicitantePrimerApellido'];
      delete datos['solicitanteSegundoApellido'];
    }

    this.guardando.set(true);
    this.solicitudesService.actualizar(this.solicitud().id, datos).subscribe({
      next: () => {
        this.guardando.set(false);
        this.guardado.emit();
      },
      error: (e) => {
        this.guardando.set(false);
        this.toast.error(mensajeError(e, 'No se pudieron guardar los cambios.'));
      },
    });
  }
}
