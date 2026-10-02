import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AdministracionService, FilaCatalogo, UsuarioAdmin } from '../../../core/services/administracion.service';
import { CatalogosService, Opcion } from '../../../core/services/catalogos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeError } from '../../../core/interceptors/auth.interceptor';
import { Icono } from '../../../shared/icono/icono';
import { Modal } from '../../../shared/modal/modal';

const DIEZ_DIGITOS = /^[0-9]{10}$/;

@Component({
  selector: 'app-usuarios-admin',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, Icono, Modal],
  templateUrl: './usuarios-admin.html',
  styles: [`
    .roles { display: flex; flex-wrap: wrap; gap: .3rem; }
    .rol { padding: .15rem .55rem; border-radius: 999px; background: var(--brand-primary-soft); color: var(--brand-primary); font-size: .72rem; font-weight: 700; }
    .roles-opciones { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; }
    td small { display: block; font-size: .76rem; color: var(--brand-muted); }
  `],
})
export class UsuariosAdmin {
  private readonly fb = inject(FormBuilder);

  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
  protected readonly instituciones = signal<Opcion[]>([]);
  protected readonly roles = signal<FilaCatalogo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly busqueda = signal('');
  protected readonly institucionFiltro = signal(0);
  protected readonly editando = signal<UsuarioAdmin | 'nuevo' | null>(null);
  protected readonly guardando = signal(false);
  protected readonly rolesElegidos = signal<number[]>([]);
  protected readonly miId;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    primerApellido: ['', Validators.required],
    segundoApellido: [''],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern(DIEZ_DIGITOS)]],
    celular: ['', [Validators.required, Validators.pattern(DIEZ_DIGITOS)]],
    institucionId: [0, Validators.min(1)],
    password: [''],
  });

  protected readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return this.usuarios().filter(
      (u) =>
        (!this.institucionFiltro() || u.institucionId === this.institucionFiltro()) &&
        (!texto || `${u.nombreCompleto} ${u.email} ${u.institucion}`.toLowerCase().includes(texto)),
    );
  });

  constructor(
    private readonly admin: AdministracionService,
    private readonly toast: ToastService,
    catalogos: CatalogosService,
    auth: AuthService,
  ) {
    this.miId = auth.currentUser()?.id;
    catalogos.instituciones().subscribe((rows) => this.instituciones.set(rows));
    this.admin.listar('roles').subscribe((rows) => this.roles.set(rows));
    this.cargar();
  }

  nuevo(): void {
    this.form.reset();
    this.rolesElegidos.set([]);
    this.editando.set('nuevo');
  }

  editar(u: UsuarioAdmin): void {
    this.form.reset({
      nombre: u.nombre,
      primerApellido: u.primerApellido,
      segundoApellido: u.segundoApellido ?? '',
      email: u.email,
      telefono: u.telefono,
      celular: u.celular,
      institucionId: u.institucionId,
      password: '',
    });
    this.rolesElegidos.set(u.roles.map((r) => r.id));
    this.editando.set(u);
  }

  alternarRol(id: number, elegido: boolean): void {
    this.rolesElegidos.update((r) => (elegido ? [...r, id] : r.filter((x) => x !== id)));
  }

  guardar(): void {
    const actual = this.editando();
    const v = this.form.getRawValue();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Revisa los datos: teléfonos de 10 dígitos y correo válido.');
      return;
    }
    if (actual === 'nuevo' && v.password.length < 8) {
      this.toast.error('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (v.password && v.password.length < 8) {
      this.toast.error('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    this.guardando.set(true);
    this.admin
      .guardarUsuario(
        { ...v, institucionId: Number(v.institucionId), password: v.password || undefined, rolIds: this.rolesElegidos() },
        actual && actual !== 'nuevo' ? actual.id : undefined,
      )
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.editando.set(null);
          this.toast.success('Se guardó el usuario.');
          this.cargar();
        },
        error: (e) => {
          this.guardando.set(false);
          this.toast.error(mensajeError(e, 'No se pudo guardar el usuario.'));
        },
      });
  }

  eliminar(u: UsuarioAdmin): void {
    void Swal.fire({
      title: '¿Eliminar usuario?',
      text: `${u.nombreCompleto} (${u.email}) ya no podrá entrar al sistema.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b3261e',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.admin.eliminarUsuario(u.id).subscribe({
        next: () => {
          this.toast.success('Usuario eliminado.');
          this.cargar();
        },
        error: (e) => this.toast.error(mensajeError(e, 'No se pudo eliminar el usuario.')),
      });
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.admin.usuarios().subscribe({
      next: (rows) => {
        this.usuarios.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los usuarios.');
      },
    });
  }
}
