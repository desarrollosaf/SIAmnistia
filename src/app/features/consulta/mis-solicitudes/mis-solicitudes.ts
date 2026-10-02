import { Component, OnInit, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicoService, SeguimientoConsulta, SolicitudConsulta } from '../../../core/services/publico.service';
import { mensajeError } from '../../../core/interceptors/auth.interceptor';
import { Icono } from '../../../shared/icono/icono';
import { Modal } from '../../../shared/modal/modal';
import { claseEstatus } from '../../../shared/archivos';

interface Hito {
  titulo: string;
  texto: string;
  fecha: string | null;
  tono: 'ok' | 'proceso' | 'error';
}

/** Solicitudes del peticionario (por la liga que recibió en su correo) y su línea de tiempo. */
@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [DatePipe, RouterLink, Icono, Modal],
  templateUrl: './mis-solicitudes.html',
  styleUrl: './mis-solicitudes.scss',
})
export class MisSolicitudes implements OnInit {
  readonly token = input.required<string>();

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly solicitudes = signal<SolicitudConsulta[]>([]);
  protected readonly seleccionada = signal<SolicitudConsulta | null>(null);
  protected readonly hitos = signal<Hito[] | null>(null);
  protected readonly claseEstatus = claseEstatus;

  constructor(private readonly publicoService: PublicoService) {}

  ngOnInit(): void {
    this.publicoService.solicitudes(this.token()).subscribe({
      next: (rows) => {
        this.solicitudes.set(rows);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar tus solicitudes.'));
        this.cargando.set(false);
      },
    });
  }

  ver(s: SolicitudConsulta): void {
    this.seleccionada.set(s);
    this.hitos.set(null);
    this.publicoService.seguimiento(this.token(), s.id).subscribe({
      next: (seg) => this.hitos.set(this.armarHitos(seg)),
      error: (e) => {
        this.seleccionada.set(null);
        this.error.set(mensajeError(e, 'No se pudo consultar la solicitud.'));
      },
    });
  }

  /** Traduce los estatus internos a una línea de tiempo comprensible para el peticionario. */
  private armarHitos(seg: SeguimientoConsulta): Hito[] {
    const hitos: Hito[] = [
      { titulo: 'Solicitud recibida', texto: 'Tu petición quedó registrada.', fecha: seg.fechaRegistro, tono: 'ok' },
    ];

    if (seg.estatus === 'REGISTRADA') {
      hitos.push({ titulo: 'En revisión', texto: 'La Comisión revisa que la solicitud cumpla los requisitos.', fecha: null, tono: 'proceso' });
      return hitos;
    }
    if (seg.estatus === 'NO PROCEDE') {
      hitos.push({ titulo: 'Solicitud no admitida', texto: 'La solicitud no fue aceptada para su estudio.', fecha: seg.fechaAprobacion, tono: 'error' });
      return hitos;
    }

    hitos.push({ titulo: 'Solicitud aceptada', texto: 'La solicitud fue aceptada para su estudio.', fecha: seg.fechaAprobacion, tono: 'ok' });
    for (const t of seg.turnos) {
      const terminado = t.estatus === 'TERMINADA';
      hitos.push({
        titulo: t.institucion,
        texto: terminado ? 'Emitió su opinión consultiva.' : `Turnada para opinión consultiva · ${t.estatus.toLowerCase()}`,
        fecha: t.fechaTurno,
        tono: terminado ? 'ok' : 'proceso',
      });
    }
    if (seg.estatus === 'TERMINADA' || seg.estatus === 'CONCLUIDA') {
      hitos.push({ titulo: 'Poder Legislativo', texto: 'La Comisión emitió su resolución.', fecha: seg.fechaFinalizo, tono: 'ok' });
    }
    if (seg.estatus === 'CONCLUIDA') {
      hitos.push({ titulo: 'Solicitud concluida', texto: 'El Poder Judicial concluyó el trámite.', fecha: null, tono: 'ok' });
    }
    return hitos;
  }
}
