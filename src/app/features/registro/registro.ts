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
import { SiNo } from '../../shared/si-no/si-no';
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

interface OtroDocumento {
  id: number;
  archivo: File | null;
  descripcion: string;
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
  imports: [ReactiveFormsModule, RouterLink, ArchivoPdf, Icono, Modal, SiNo],
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
  protected readonly designacion = signal<File | null>(null);
  protected readonly autorizacionOrganismo = signal<File | null>(null);
  protected readonly acreditacionTitular = signal<File | null>(null);
  protected readonly curpArchivo = signal<File | null>(null);
  protected readonly sentencia = signal<File | null>(null);
  protected readonly verdadHechos = signal<File | null>(null);
  protected readonly averiguacionPrevia = signal<File | null>(null);
  protected readonly constanciasProceso = signal<File | null>(null);
  protected readonly noReincidencia = signal<File | null>(null);
  protected readonly situacionSocioeconomica = signal<File | null>(null);
  protected readonly calidadIndigena = signal<File | null>(null);
  // Documentos "Otro": se marca la casilla y se agrega uno o más archivos, cada uno con su descripción.
  protected readonly usaOtros = signal(false);
  protected readonly otros = signal<OtroDocumento[]>([]);
  private siguienteOtro = 0;
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
    titularNombre: [''],
    titularPrimerApellido: [''],
    titularSegundoApellido: [''],
    acreditacionDescripcion: [''],
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

  // Datos complementarios del beneficiario (formato de solicitud). Todos opcionales; true/false/null en los "sí / no".
  protected readonly complemento = this.fb.nonNullable.group({
    estadoSeEncuentra: [''],
    fechaComisionDelito: [''],
    comunidad: [''],
    comunidadIndigenaCual: [''],
    interprete: [null as boolean | null],
    discapacidad: [null as boolean | null],
    discapacidadCual: [''],
    enfermedadCronica: [null as boolean | null],
    enfermedadCronicaCual: [''],
    ocupacionPrevia: [''],
    dependientesEconomicos: [''],
    situacionLibertad: [''],
    medidaSeguridadCual: [''],
    investigacionNumero: [''],
    investigacionAgencia: [''],
    penaAnios: [null as number | null, [Validators.min(0), Validators.max(100)]],
    penaMeses: [null as number | null, [Validators.min(0), Validators.max(100)]],
    multa: [null as boolean | null],
    multaMonto: [null as number | null, Validators.min(0)],
    apelacion: [null as boolean | null],
    apelacionToca: [''],
    apelacionTribunal: [''],
    apelacionResolucion: [''],
    penaModificada: [null as boolean | null],
    penaCompurgarAnios: [null as number | null, [Validators.min(0), Validators.max(100)]],
    penaCompurgarMeses: [null as number | null, [Validators.min(0), Validators.max(100)]],
    amparo: [null as boolean | null],
    amparoEfectos: [''],
    amparoConcedido: [null as boolean | null],
    sentenciadoAntesMismoDelito: [null as boolean | null],
    otroProceso: [null as boolean | null],
    otroProcesoExpediente: [''],
    otroProcesoJuzgado: [''],
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
  protected readonly comp = signal(this.complemento.getRawValue());
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
    cambios(this.complemento, () => this.comp.set(this.complemento.getRawValue()));
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
          if (v.titularNombre.trim().length < 2 || v.titularPrimerApellido.trim().length < 2) {
            return fallar('Captura el nombre y primer apellido del titular o representante legal del organismo.');
          }
          if (this.acreditacionTitular() && !v.acreditacionDescripcion.trim()) return fallar('Describe el documento que acredita al titular o representante legal.');
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
        if (this.otrosCapturados().some((o) => !o.descripcion.trim()) || this.otros().some((o) => o.descripcion.trim() && !o.archivo)) {
          return fallar('Cada documento "Otro" necesita su archivo PDF y su descripción.');
        }
        if (this.complemento.invalid) {
          this.complemento.markAllAsTouched();
          return fallar('Revisa los datos adicionales del beneficiario (los números no pueden ser negativos).');
        }
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
        titularNombre: fisica ? undefined : p.titularNombre,
        titularPrimerApellido: fisica ? undefined : p.titularPrimerApellido,
        titularSegundoApellido: fisica ? undefined : p.titularSegundoApellido || undefined,
        acreditacionDescripcion: !fisica && this.acreditacionTitular() ? p.acreditacionDescripcion : undefined,
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
      datosFormato: this.datosFormato(),
      otrosDocumentos: this.otrosCapturados().map((o) => ({ descripcion: o.descripcion.trim() })),
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
    adjuntar('designacion_representante', fisica && !p.relacion ? this.designacion() : null);
    adjuntar('autorizacion_organismo', fisica ? null : this.autorizacionOrganismo());
    adjuntar('acreditacion_titular', fisica ? null : this.acreditacionTitular());
    adjuntar('curp', this.curpArchivo());
    adjuntar('sentencia', this.situacion() === 'Sentenciado' ? this.sentencia() : null);
    adjuntar('verdad_hechos', this.verdadHechos());
    adjuntar('averiguacion_previa', this.averiguacionPrevia());
    adjuntar('constancias_proceso', this.constanciasProceso());
    adjuntar('no_reincidencia', this.noReincidencia());
    adjuntar('situacion_socioeconomica', this.situacionSocioeconomica());
    adjuntar('calidad_indigena', this.calidadIndigena());
    this.otrosCapturados().forEach((o) => form.append('otros_documentos', o.archivo!));

    this.enviando.set(true);
    this.progreso.set(0);
    this.publicoService.registrar(form).subscribe({
      next: (evento) => {
        if (evento.type === HttpEventType.UploadProgress && evento.total) {
          this.progreso.set(Math.round((evento.loaded / evento.total) * 100));
        } else if (evento.type === HttpEventType.Response && evento.body) {
          this.enviando.set(false);
          this.mostrarExito(evento.body.folio, evento.body.uuid, evento.body.formatoUuid);
        }
      },
      error: (e) => {
        this.enviando.set(false);
        void Swal.fire({ title: 'No se pudo registrar', text: mensajeError(e, 'Ocurrió un error al guardar la solicitud.'), icon: 'error', confirmButtonColor: '#960048' });
      },
    });
  }

  /** Documentos "Otro" con archivo (solo si la casilla está marcada); las filas vacías se ignoran. */
  private otrosCapturados(): OtroDocumento[] {
    return this.usaOtros() ? this.otros().filter((o) => o.archivo) : [];
  }

  protected alternarOtros(marcado: boolean): void {
    this.usaOtros.set(marcado);
    if (marcado && !this.otros().length) this.agregarOtro();
  }

  protected agregarOtro(): void {
    this.otros.update((lista) => [...lista, { id: this.siguienteOtro++, archivo: null, descripcion: '' }]);
  }

  protected quitarOtro(id: number): void {
    this.otros.update((lista) => lista.filter((o) => o.id !== id));
    if (!this.otros().length) this.usaOtros.set(false);
  }

  protected cambiarOtro(id: number, cambios: Partial<OtroDocumento>): void {
    this.otros.update((lista) => lista.map((o) => (o.id === id ? { ...o, ...cambios } : o)));
  }

  /** Respuestas complementarias del beneficiario: se omiten las vacías y las que dependen de un "No". */
  private datosFormato(): Record<string, unknown> {
    const v = this.complemento.getRawValue();
    const texto = (t: string) => t.trim() || undefined;
    const numero = (n: number | null) => (n === null || n === undefined || Number.isNaN(Number(n)) ? undefined : Number(n));
    const bool = (b: boolean | null) => b ?? undefined;
    return {
      estadoSeEncuentra: texto(v.estadoSeEncuentra),
      fechaComisionDelito: v.fechaComisionDelito || undefined,
      comunidad: v.comunidad || undefined,
      comunidadIndigenaCual: v.comunidad === 'INDIGENA' ? texto(v.comunidadIndigenaCual) : undefined,
      interprete: bool(v.interprete),
      discapacidad: bool(v.discapacidad),
      discapacidadCual: v.discapacidad ? texto(v.discapacidadCual) : undefined,
      enfermedadCronica: bool(v.enfermedadCronica),
      enfermedadCronicaCual: v.enfermedadCronica ? texto(v.enfermedadCronicaCual) : undefined,
      ocupacionPrevia: texto(v.ocupacionPrevia),
      dependientesEconomicos: texto(v.dependientesEconomicos),
      situacionLibertad: v.situacionLibertad || undefined,
      medidaSeguridadCual: v.situacionLibertad === 'MEDIDA_SEGURIDAD' ? texto(v.medidaSeguridadCual) : undefined,
      investigacionNumero: texto(v.investigacionNumero),
      investigacionAgencia: texto(v.investigacionAgencia),
      penaAnios: numero(v.penaAnios),
      penaMeses: numero(v.penaMeses),
      multa: bool(v.multa),
      multaMonto: v.multa ? numero(v.multaMonto) : undefined,
      apelacion: bool(v.apelacion),
      apelacionToca: v.apelacion ? texto(v.apelacionToca) : undefined,
      apelacionTribunal: v.apelacion ? texto(v.apelacionTribunal) : undefined,
      apelacionResolucion: v.apelacion ? v.apelacionResolucion || undefined : undefined,
      penaModificada: v.apelacion ? bool(v.penaModificada) : undefined,
      penaCompurgarAnios: v.apelacion && v.penaModificada ? numero(v.penaCompurgarAnios) : undefined,
      penaCompurgarMeses: v.apelacion && v.penaModificada ? numero(v.penaCompurgarMeses) : undefined,
      amparo: bool(v.amparo),
      amparoEfectos: v.amparo ? texto(v.amparoEfectos) : undefined,
      amparoConcedido: v.amparo ? bool(v.amparoConcedido) : undefined,
      sentenciadoAntesMismoDelito: bool(v.sentenciadoAntesMismoDelito),
      otroProceso: bool(v.otroProceso),
      otroProcesoExpediente: v.otroProceso ? texto(v.otroProcesoExpediente) : undefined,
      otroProcesoJuzgado: v.otroProceso ? texto(v.otroProcesoJuzgado) : undefined,
    };
  }

  /** Descarga un PDF del backend sin salir de la página (el servidor responde con Content-Disposition: attachment). */
  private descargar(url: string): void {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.rel = 'noopener';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  }

  private mostrarExito(folio: string, uuid: string, formatoUuid: string | null): void {
    // Al guardar se descargan solos el acuse y el formato de solicitud (con una pausa para que el
    // navegador acepte las dos descargas); los botones del aviso permiten repetirlas.
    this.descargar(this.publicoService.urlAcuse(uuid, true));
    if (formatoUuid) setTimeout(() => this.descargar(this.publicoService.urlFormato(formatoUuid, true)), 800);
    void Swal.fire({
      title: '¡Solicitud registrada!',
      html: `Tu número de solicitud es <strong style="font-size:1.3em;color:#960048">${this.escapar(folio)}</strong>.<br><br>
             Consérvalo. Te enviamos el acuse a tu correo; para ver el estatus usa <em>Consultar solicitud</em> con ese mismo correo.<br><br>
             Se descargaron tu acuse{{formato}}. Si no se guardaron, usa los botones de abajo.`.replace('{{formato}}', formatoUuid ? ' y tu formato de solicitud' : ''),
      icon: 'success',
      showCancelButton: true,
      showDenyButton: !!formatoUuid,
      confirmButtonText: 'Descargar acuse',
      denyButtonText: 'Descargar formato de solicitud',
      cancelButtonText: 'Terminar',
      confirmButtonColor: '#960048',
      denyButtonColor: '#960048',
      allowOutsideClick: false,
      // Los botones de descarga no cierran el aviso: así se pueden bajar ambos documentos.
      preConfirm: () => {
        this.descargar(this.publicoService.urlAcuse(uuid, true));
        return false;
      },
      preDeny: () => {
        if (formatoUuid) this.descargar(this.publicoService.urlFormato(formatoUuid, true));
        return false;
      },
    }).then((r) => {
      if (r.isDismissed) window.location.reload();
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
