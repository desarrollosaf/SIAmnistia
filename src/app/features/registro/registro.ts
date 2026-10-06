import {
  Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Quill from 'quill';
import Swal from 'sweetalert2';
import { CatalogosFormulario, CatalogosService, DelitoCatalogo, Opcion } from '../../core/services/catalogos.service';
import { PublicoService } from '../../core/services/publico.service';
import { ToastService } from '../../core/services/toast.service';
import { mensajeError } from '../../core/interceptors/auth.interceptor';
import { ArchivoPdf } from '../../shared/archivo-pdf/archivo-pdf';
import { Icono } from '../../shared/icono/icono';
import { Modal } from '../../shared/modal/modal';
import { PASOS } from './pasos';

const REGEX_CURP =
  /^[A-Z]{4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[HMX](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[A-Z]{3}[0-9A-Z][0-9]$/;
const DIEZ_DIGITOS = /^[0-9]{10}$/;

interface DelitoCarpeta {
  delitoId: number;
  modalidadId: number | null;
  delitoOtro: string;
  texto: string;
}

interface Carpeta {
  carpeta: string;
  razonSolicitudId: number;
  razon: string;
  conoceUbicacion: boolean;
  tomo: string;
  foja: string;
  delitos: DelitoCarpeta[];
}

const curpValida = (c: AbstractControl): ValidationErrors | null =>
  !c.value || REGEX_CURP.test(String(c.value).toUpperCase()) ? null : { curp: true };

const esOtro = (texto: string | undefined) => (texto ?? '').trim().toUpperCase().startsWith('OTRO');

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ArchivoPdf, Icono, Modal],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pasos = PASOS;
  protected readonly paso = signal(0);
  protected readonly maxAlcanzado = signal(0);
  protected readonly ayuda = signal<number | null>(null);
  protected readonly catalogos = signal<CatalogosFormulario | null>(null);
  protected readonly municipios = signal<Opcion[]>([]);
  protected readonly enviando = signal(false);
  protected readonly progreso = signal(0);

  // Consentimientos previos al formulario.
  protected readonly aceptaPrivacidad = signal(false);
  protected readonly aceptaLey = signal(false);
  // Una vez aceptado, el formulario se queda abierto aunque desmarquen (para no perder lo capturado).
  protected readonly iniciado = signal(false);

  // Archivos.
  protected readonly identificacion = signal<File | null>(null);
  protected readonly acta = signal<File | null>(null);
  protected readonly curpArchivo = signal<File | null>(null);
  protected readonly sentencia = signal<File | null>(null);
  protected readonly verdadHechos = signal<File | null>(null);
  protected readonly intentoPaso = signal<number[]>([]);

  // Carpetas y delitos.
  protected readonly carpetas = signal<Carpeta[]>([]);
  protected readonly carpetaDelitos = signal<number | null>(null);
  protected readonly delitoAbierto = signal(0);

  protected readonly fechaMin = `${new Date().getFullYear() - 100}-01-01`;
  protected readonly fechaMax = `${new Date().getFullYear() - 10}-12-31`;

  protected readonly peticionario = this.fb.nonNullable.group({
    tipoSolicitanteId: [0, Validators.min(1)],
    nombre: [''],
    primerApellido: [''],
    segundoApellido: [''],
    nombreInstitucion: [''],
    rfc: [''],
    generoId: [0],
    generoOtro: [''],
    relacion: [false],
    parentescoId: [0],
    parentescoOtro: [''],
  });

  protected readonly domicilio = this.fb.nonNullable.group({
    calle: ['', Validators.required],
    numExt: ['', [Validators.required, Validators.maxLength(10)]],
    numInt: [''],
    colonia: ['', Validators.required],
    codigoPostal: ['', Validators.pattern(/^[0-9]{5}$/)],
    entidadId: [0, Validators.min(1)],
    municipioId: [0, Validators.min(1)],
  });

  protected readonly contacto = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern(DIEZ_DIGITOS)]],
    celular: ['', [Validators.required, Validators.pattern(DIEZ_DIGITOS)]],
  });

  protected readonly beneficiario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    primerApellido: ['', [Validators.required, Validators.minLength(2)]],
    segundoApellido: [''],
    fechaNacimiento: ['', Validators.required],
    generoId: [0, Validators.min(1)],
    generoOtro: [''],
    curp: ['', [Validators.required, curpValida]],
  });

  protected readonly nuevaCarpeta = this.fb.nonNullable.group({
    carpeta: [''],
    razonSolicitudId: [0],
    conoceUbicacion: [false],
    tomo: [''],
    foja: [''],
  });

  protected readonly nuevoDelito = this.fb.nonNullable.group({
    delitoId: [0],
    modalidadId: [0],
    delitoOtro: [''],
  });

  protected readonly solicitud = this.fb.nonNullable.group({
    cprs: ['', Validators.required],
    situacionJuridicaId: [0, Validators.min(1)],
    otroSituacionJuridica: [''],
    tipoDefensorId: [0, Validators.min(1)],
    juzgado: ['', Validators.required],
    perfilCriminologicoId: [0, Validators.min(1)],
    nivelDelitoId: [0, Validators.min(1)],
    procedimientoAbreviado: [false],
  });

  // Valores derivados para mostrar/ocultar campos.
  private readonly peticionarioValor = signal(this.peticionario.getRawValue());
  private readonly beneficiarioValor = signal(this.beneficiario.getRawValue());
  private readonly solicitudValor = signal(this.solicitud.getRawValue());
  protected readonly delitoValor = signal(this.nuevoDelito.getRawValue());
  protected readonly conoceUbicacion = signal(false);

  protected readonly esFisica = computed(() => this.nombreDe(this.catalogos()?.tiposSolicitante, this.peticionarioValor().tipoSolicitanteId).toUpperCase().startsWith('F'));
  protected readonly tipoElegido = computed(() => this.peticionarioValor().tipoSolicitanteId > 0);
  protected readonly generoOtroPeticionario = computed(() => esOtro(this.nombreDe(this.catalogos()?.generos, this.peticionarioValor().generoId)));
  protected readonly generoOtroBeneficiario = computed(() => esOtro(this.nombreDe(this.catalogos()?.generos, this.beneficiarioValor().generoId)));
  protected readonly parentescoOtro = computed(() => {
    const p = this.catalogos()?.parentescos.find((x) => x.id === Number(this.peticionarioValor().parentescoId));
    return p?.clave === 'OTRO';
  });
  protected readonly relacion = computed(() => this.peticionarioValor().relacion);
  protected readonly situacion = computed(() => this.nombreDe(this.catalogos()?.situacionesJuridicas, this.solicitudValor().situacionJuridicaId));
  protected readonly delitoElegido = computed<DelitoCatalogo | null>(
    () => this.catalogos()?.delitos.find((d) => d.id === Number(this.delitoValor().delitoId)) ?? null,
  );
  protected readonly delitoEsOtro = computed(() => esOtro(this.delitoElegido()?.nombre));
  protected readonly progresoPorcentaje = computed(() => ((this.paso() + 1) / this.pasos.length) * 100);

  private readonly editorNarrativa = viewChild<ElementRef<HTMLElement>>('editorNarrativa');
  private readonly editorInformacion = viewChild<ElementRef<HTMLElement>>('editorInformacion');
  private quillNarrativa?: Quill;
  private quillInformacion?: Quill;

  constructor(
    private readonly catalogosService: CatalogosService,
    private readonly publicoService: PublicoService,
    private readonly toast: ToastService,
  ) {
    this.catalogosService.formulario().subscribe({
      next: (c) => this.catalogos.set(c),
      error: () => this.toast.error('No se pudieron cargar los catálogos. Recarga la página.'),
    });

    // Refleja cada formulario en una señal para que los campos condicionales reaccionen.
    const cambios = (form: { valueChanges: Observable<unknown> }, alCambiar: () => void) =>
      form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(alCambiar);
    cambios(this.peticionario, () => this.peticionarioValor.set(this.peticionario.getRawValue()));
    cambios(this.beneficiario, () => this.beneficiarioValor.set(this.beneficiario.getRawValue()));
    cambios(this.solicitud, () => this.solicitudValor.set(this.solicitud.getRawValue()));
    cambios(this.nuevoDelito, () => this.delitoValor.set(this.nuevoDelito.getRawValue()));
    this.nuevaCarpeta.controls.conoceUbicacion.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.conoceUbicacion.set(v));

    this.domicilio.controls.entidadId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
      this.domicilio.controls.municipioId.setValue(0);
      this.municipios.set([]);
      if (Number(id) > 0) {
        this.catalogosService.municipios(Number(id)).subscribe((m) => this.municipios.set(m));
      }
    });
    this.nuevoDelito.controls.delitoId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.nuevoDelito.patchValue({ modalidadId: 0, delitoOtro: '' }, { emitEvent: false });
      this.delitoValor.set(this.nuevoDelito.getRawValue());
    });

    effect(() => {
      if (this.aceptaPrivacidad() && this.aceptaLey()) this.iniciado.set(true);
    });
    // Los editores existen hasta que se muestra el formulario.
    effect(() => {
      if (this.editorNarrativa() && this.editorInformacion()) this.iniciarEditores();
    });
  }

  private iniciarEditores(): void {
    const toolbar = [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ align: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean'],
    ];
    const narrativa = this.editorNarrativa()?.nativeElement;
    const informacion = this.editorInformacion()?.nativeElement;
    if (narrativa && !this.quillNarrativa) this.quillNarrativa = new Quill(narrativa, { theme: 'snow', modules: { toolbar }, placeholder: 'Describe los hechos…' });
    if (informacion && !this.quillInformacion) this.quillInformacion = new Quill(informacion, { theme: 'snow', modules: { toolbar }, placeholder: 'Detalles adicionales de tu solicitud…' });
  }

  // ---------------------------------------------------------------------------------------
  // Navegación
  // ---------------------------------------------------------------------------------------

  siguiente(): void {
    if (!this.validarPaso(this.paso())) return;
    const nuevo = this.paso() + 1;
    this.paso.set(nuevo);
    this.maxAlcanzado.update((m) => Math.max(m, nuevo));
    this.subirAlFormulario();
  }

  anterior(): void {
    this.paso.update((p) => Math.max(0, p - 1));
    this.subirAlFormulario();
  }

  irA(indice: number): void {
    if (indice <= this.maxAlcanzado()) {
      this.paso.set(indice);
      this.subirAlFormulario();
    }
  }

  invalido(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.intentoPaso().includes(this.paso()));
  }

  private subirAlFormulario(): void {
    document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Valida el paso indicado; marca los campos y avisa el primer problema. */
  private validarPaso(indice: number): boolean {
    this.intentoPaso.update((p) => (p.includes(indice) ? p : [...p, indice]));
    const fallar = (mensaje: string) => {
      this.toast.error(mensaje);
      return false;
    };

    switch (indice) {
      case 0: {
        const v = this.peticionario.getRawValue();
        this.peticionario.markAllAsTouched();
        if (!v.tipoSolicitanteId) return fallar('Selecciona el tipo de persona.');
        if (this.esFisica()) {
          if (v.nombre.trim().length < 2 || v.primerApellido.trim().length < 2) return fallar('Captura el nombre y primer apellido del peticionario.');
          if (!v.generoId) return fallar('Selecciona el género del peticionario.');
          if (this.generoOtroPeticionario() && !v.generoOtro.trim()) return fallar('Especifica el género.');
          if (v.relacion) {
            if (!v.parentescoId) return fallar('Selecciona el parentesco con el beneficiario.');
            if (this.parentescoOtro() && !v.parentescoOtro.trim()) return fallar('Especifica el parentesco.');
            if (!this.acta()) return fallar('Adjunta el acta de nacimiento que acredita el parentesco.');
          }
        } else {
          if (v.nombreInstitucion.trim().length < 2) return fallar('Captura el nombre de la institución u organismo.');
          if (v.rfc.trim().length < 9) return fallar('Captura el RFC de la institución u organismo.');
        }
        if (!this.identificacion()) return fallar('Adjunta la identificación oficial o poder notarial.');
        return true;
      }
      case 1:
        this.domicilio.markAllAsTouched();
        return this.domicilio.valid || fallar('Revisa los datos del domicilio.');
      case 2:
        this.contacto.markAllAsTouched();
        return this.contacto.valid || fallar('Revisa el correo y los teléfonos (10 dígitos).');
      case 3: {
        this.beneficiario.markAllAsTouched();
        if (this.beneficiario.invalid) return fallar('Revisa los datos del beneficiario.');
        if (this.generoOtroBeneficiario() && !this.beneficiario.getRawValue().generoOtro.trim()) return fallar('Especifica el género del beneficiario.');
        if (!this.curpArchivo()) return fallar('Adjunta la constancia de CURP del beneficiario.');
        return true;
      }
      case 4:
        if (!this.carpetas().length) return fallar('Agrega al menos una carpeta de investigación.');
        if (this.carpetas().some((c) => !c.delitos.length)) return fallar('Una o varias carpetas no tienen delitos agregados.');
        return true;
      case 5: {
        this.solicitud.markAllAsTouched();
        if (this.solicitud.invalid) return fallar('Llena los datos obligatorios de la solicitud.');
        if (this.situacion() === 'Sentenciado' && !this.sentencia()) return fallar('Adjunta la sentencia definitiva.');
        if (this.situacion() === 'Otro' && !this.solicitud.getRawValue().otroSituacionJuridica.trim()) return fallar('Especifica la situación jurídica.');
        return true;
      }
      default:
        return true;
    }
  }

  // ---------------------------------------------------------------------------------------
  // Carpetas y delitos
  // ---------------------------------------------------------------------------------------

  agregarCarpeta(): void {
    const v = this.nuevaCarpeta.getRawValue();
    const carpeta = v.carpeta.trim().toUpperCase();
    if (!carpeta || !v.razonSolicitudId) {
      this.toast.error('Indica el número de carpeta y la razón de la solicitud.');
      return;
    }
    if (v.conoceUbicacion && (!v.tomo.trim() || !v.foja.trim())) {
      this.toast.error('Indica el tomo y la foja de la violación.');
      return;
    }
    if (this.carpetas().some((c) => c.carpeta === carpeta)) {
      this.toast.error('Esa carpeta ya está en la lista.');
      return;
    }
    this.carpetas.update((lista) => [
      ...lista,
      {
        carpeta,
        razonSolicitudId: Number(v.razonSolicitudId),
        razon: this.nombreDe(this.catalogos()?.razonesSolicitud, v.razonSolicitudId),
        conoceUbicacion: v.conoceUbicacion,
        tomo: v.conoceUbicacion ? v.tomo.trim().toUpperCase() : '',
        foja: v.conoceUbicacion ? v.foja.trim().toUpperCase() : '',
        delitos: [],
      },
    ]);
    this.nuevaCarpeta.reset();
    // Lo natural tras agregar la carpeta es capturar sus delitos.
    this.abrirDelitos(this.carpetas().length - 1);
  }

  quitarCarpeta(indice: number): void {
    void Swal.fire({
      title: '¿Quitar la carpeta?',
      text: `Se quitará ${this.carpetas()[indice].carpeta} con sus delitos.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b3261e',
    }).then((r) => {
      if (r.isConfirmed) this.carpetas.update((lista) => lista.filter((_, i) => i !== indice));
    });
  }

  abrirDelitos(indice: number): void {
    this.nuevoDelito.reset();
    this.delitoAbierto.set(0);
    this.carpetaDelitos.set(indice);
  }

  /** Abre/cierra un delito del acordeón; al abrir otro se descarta la selección del anterior. */
  protected alternarDelito(id: number): void {
    if (this.delitoAbierto() === id) {
      this.delitoAbierto.set(0);
      return;
    }
    this.delitoAbierto.set(id);
    if (this.delitoValor().delitoId !== id) this.nuevoDelito.controls.delitoId.setValue(id);
  }

  protected esOtroDelito(d: DelitoCatalogo): boolean {
    return esOtro(d.nombre);
  }

  /** El delito tiene una opción elegida (modalidad, nombre capturado o sin modalidades). */
  protected delitoConOpcion(d: DelitoCatalogo): boolean {
    const v = this.delitoValor();
    if (v.delitoId !== d.id) return false;
    if (esOtro(d.nombre)) return v.delitoOtro.trim().length > 0;
    return d.modalidades.length ? v.modalidadId > 0 : true;
  }

  /** Separa un texto en líneas (el catálogo trae saltos antes de los numerales I., II., ...). */
  protected lineas(texto: string): { texto: string; sangria: boolean }[] {
    return texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => ({ texto: l, sangria: /^[IVXLC]+\.\s/.test(l) }));
  }

  agregarDelito(): void {
    const indice = this.carpetaDelitos();
    const delito = this.delitoElegido();
    if (indice === null || !delito) {
      this.toast.error('Selecciona un delito.');
      return;
    }
    const v = this.nuevoDelito.getRawValue();
    let texto = delito.nombre;
    let modalidadId: number | null = null;
    let delitoOtro = '';

    if (this.delitoEsOtro()) {
      delitoOtro = v.delitoOtro.trim().toUpperCase();
      if (!delitoOtro) {
        this.toast.error('Escribe el nombre del delito.');
        return;
      }
      texto = delitoOtro;
    } else if (delito.modalidades.length) {
      const modalidad = delito.modalidades.find((m) => m.id === Number(v.modalidadId));
      if (!modalidad) {
        this.toast.error('Selecciona una modalidad.');
        return;
      }
      modalidadId = modalidad.id;
      texto = `${delito.nombre} - ${modalidad.nombre}`;
    }

    if (this.carpetas()[indice].delitos.some((d) => d.texto === texto)) {
      this.toast.error('Ese delito ya está agregado.');
      return;
    }
    this.carpetas.update((lista) =>
      lista.map((c, i) => (i === indice ? { ...c, delitos: [...c.delitos, { delitoId: delito.id, modalidadId, delitoOtro, texto }] } : c)),
    );
    this.nuevoDelito.reset();
    this.delitoAbierto.set(0);
    this.toast.success('Se agregó el delito.');
  }

  quitarDelito(indiceDelito: number): void {
    const indice = this.carpetaDelitos();
    if (indice === null) return;
    this.carpetas.update((lista) =>
      lista.map((c, i) => (i === indice ? { ...c, delitos: c.delitos.filter((_, j) => j !== indiceDelito) } : c)),
    );
  }

  // ---------------------------------------------------------------------------------------
  // Envío
  // ---------------------------------------------------------------------------------------

  enviar(): void {
    if (!this.aceptaPrivacidad() || !this.aceptaLey()) {
      this.toast.error('Acepta el aviso de privacidad y la declaración sobre la Ley de Amnistía.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    for (let i = 0; i < this.pasos.length - 1; i++) {
      if (!this.validarPaso(i)) {
        this.paso.set(i);
        this.subirAlFormulario();
        return;
      }
    }

    const p = this.peticionario.getRawValue();
    const b = this.beneficiario.getRawValue();
    void Swal.fire({
      title: '¿Enviar la solicitud?',
      html: `Beneficiario: <strong>${this.escapar(`${b.nombre} ${b.primerApellido} ${b.segundoApellido}`.toUpperCase())}</strong><br>
             Carpetas: <strong>${this.carpetas().length}</strong><br><br>
             Verifica que tus datos sean correctos: una vez enviada no podrás modificarla.`,
      icon: 'question',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Revisar',
      confirmButtonColor: '#960048',
    }).then((r) => {
      if (r.isConfirmed) this.registrar(p);
    });
  }

  private registrar(p: ReturnType<Registro['peticionario']['getRawValue']>): void {
    const d = this.domicilio.getRawValue();
    const c = this.contacto.getRawValue();
    const b = this.beneficiario.getRawValue();
    const s = this.solicitud.getRawValue();
    const fisica = this.esFisica();

    const datos = {
      solicitante: {
        tipoSolicitanteId: Number(p.tipoSolicitanteId),
        nombre: fisica ? p.nombre : undefined,
        primerApellido: fisica ? p.primerApellido : undefined,
        segundoApellido: fisica && p.segundoApellido ? p.segundoApellido : undefined,
        nombreInstitucion: fisica ? undefined : p.nombreInstitucion,
        rfc: fisica ? undefined : p.rfc,
        generoId: fisica ? Number(p.generoId) : undefined,
        generoOtro: fisica && this.generoOtroPeticionario() ? p.generoOtro : undefined,
        relacion: fisica && p.relacion,
        parentescoId: fisica && p.relacion ? Number(p.parentescoId) : undefined,
        parentescoOtro: fisica && p.relacion && this.parentescoOtro() ? p.parentescoOtro : undefined,
        email: c.email,
        telefono: c.telefono,
        celular: c.celular,
      },
      domicilio: {
        calle: d.calle,
        numExt: d.numExt,
        numInt: d.numInt || undefined,
        colonia: d.colonia,
        codigoPostal: d.codigoPostal || undefined,
        entidadId: Number(d.entidadId),
        municipioId: Number(d.municipioId),
      },
      beneficiario: {
        nombre: b.nombre,
        primerApellido: b.primerApellido,
        segundoApellido: b.segundoApellido || undefined,
        fechaNacimiento: b.fechaNacimiento,
        generoId: Number(b.generoId),
        generoOtro: this.generoOtroBeneficiario() ? b.generoOtro : undefined,
        curp: b.curp.toUpperCase(),
      },
      carpetas: this.carpetas().map((carpeta) => ({
        carpeta: carpeta.carpeta,
        razonSolicitudId: carpeta.razonSolicitudId,
        conoceUbicacion: carpeta.conoceUbicacion,
        tomo: carpeta.tomo || undefined,
        foja: carpeta.foja || undefined,
        delitos: carpeta.delitos.map((dl) => ({
          delitoId: dl.delitoId,
          modalidadId: dl.modalidadId ?? undefined,
          delitoOtro: dl.delitoOtro || undefined,
        })),
      })),
      solicitud: {
        cprs: s.cprs,
        situacionJuridicaId: Number(s.situacionJuridicaId),
        otroSituacionJuridica: this.situacion() === 'Otro' ? s.otroSituacionJuridica : undefined,
        tipoDefensorId: Number(s.tipoDefensorId),
        juzgado: s.juzgado,
        perfilCriminologicoId: Number(s.perfilCriminologicoId),
        nivelDelitoId: Number(s.nivelDelitoId),
        procedimientoAbreviado: s.procedimientoAbreviado,
      },
      observacionesHechos: this.contenidoEditor(this.quillNarrativa),
      informacionComplementaria: this.contenidoEditor(this.quillInformacion),
    };

    const form = new FormData();
    form.append('datos', JSON.stringify(datos));
    const adjuntar = (campo: string, archivo: File | null) => archivo && form.append(campo, archivo);
    adjuntar('identificacion', this.identificacion());
    adjuntar('acta_nacimiento', fisica && p.relacion ? this.acta() : null);
    adjuntar('curp', this.curpArchivo());
    adjuntar('sentencia', this.situacion() === 'Sentenciado' ? this.sentencia() : null);
    adjuntar('verdad_hechos', this.verdadHechos());

    this.enviando.set(true);
    this.progreso.set(0);
    this.publicoService.registrar(form).subscribe({
      next: (evento) => {
        if (evento.type === HttpEventType.UploadProgress && evento.total) {
          this.progreso.set(Math.round((evento.loaded / evento.total) * 100));
        } else if (evento.type === HttpEventType.Response && evento.body) {
          this.enviando.set(false);
          this.mostrarExito(evento.body.folio, evento.body.uuid);
        }
      },
      error: (e) => {
        this.enviando.set(false);
        void Swal.fire({ title: 'No se pudo registrar', text: mensajeError(e, 'Ocurrió un error al guardar la solicitud.'), icon: 'error', confirmButtonColor: '#960048' });
      },
    });
  }

  private mostrarExito(folio: string, uuid: string): void {
    void Swal.fire({
      title: '¡Solicitud registrada!',
      html: `Tu número de solicitud es <strong style="font-size:1.3em;color:#960048">${this.escapar(folio)}</strong>.<br><br>
             Consérvalo. Te enviamos el acuse a tu correo; para ver el estatus usa <em>Consultar solicitud</em> con ese mismo correo.`,
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Ver acuse',
      cancelButtonText: 'Terminar',
      confirmButtonColor: '#960048',
      allowOutsideClick: false,
    }).then((r) => {
      if (r.isConfirmed) window.open(this.publicoService.urlAcuse(uuid), '_blank');
      window.location.reload();
    });
  }

  // ---------------------------------------------------------------------------------------

  protected nombreDe(lista: Opcion[] | undefined, id: number | string): string {
    return lista?.find((o) => o.id === Number(id))?.nombre ?? '';
  }

  private contenidoEditor(editor?: Quill): string | undefined {
    if (!editor || !editor.getText().trim()) return undefined;
    return editor.root.innerHTML;
  }

  private escapar(texto: string): string {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }
}
