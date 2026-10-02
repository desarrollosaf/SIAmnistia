import { Component, OnInit, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicoService, ValidacionAcuse } from '../../core/services/publico.service';
import { Icono } from '../../shared/icono/icono';

/** Destino del código QR del acuse: confirma que el documento es auténtico. */
@Component({
  selector: 'app-validar-acuse',
  standalone: true,
  imports: [DatePipe, RouterLink, Icono],
  template: `
    <section class="validacion panel">
      @if (cargando()) {
        <p class="hint">Validando el acuse…</p>
      } @else if (resultado(); as r) {
        <span class="validacion__icono validacion__icono--ok"><app-icono nombre="escudo" /></span>
        <h1>Acuse válido</h1>
        <p>El acuse corresponde a la solicitud <strong>{{ r.nus }}</strong>, registrada el {{ r.fechaRegistro | date: "dd/MM/yyyy 'a las' HH:mm" }}.</p>
        @if (r.uuid) {
          <a class="btn btn--primary" [href]="urlAcuse(r.uuid)" target="_blank" rel="noopener"><app-icono nombre="pdf" /> Ver acuse</a>
        }
      } @else {
        <span class="validacion__icono validacion__icono--error"><app-icono nombre="alerta" /></span>
        <h1>No se pudo validar</h1>
        <p>No hay solicitudes registradas para esta cadena de validación.</p>
        <a class="btn btn--outline" routerLink="/consulta">Consultar mis solicitudes</a>
      }
    </section>
  `,
  styles: [`
    .validacion { max-width: 520px; margin: 2rem auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: .6rem; }
    h1 { margin: .4rem 0 0; font-size: 1.35rem; font-weight: 800; }
    p { margin: 0 0 .8rem; color: var(--brand-muted); }
    .validacion__icono { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; }
    .validacion__icono app-icono { width: 30px; height: 30px; }
    .validacion__icono--ok { background: #e6f5ec; color: #1a8a4a; }
    .validacion__icono--error { background: var(--brand-danger-bg); color: var(--brand-danger); }
  `],
})
export class ValidarAcuse implements OnInit {
  readonly cadena = input.required<string>();
  protected readonly cargando = signal(true);
  protected readonly resultado = signal<ValidacionAcuse | null>(null);

  constructor(private readonly publicoService: PublicoService) {}

  ngOnInit(): void {
    this.publicoService.validarAcuse(this.cadena()).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  urlAcuse(uuid: string): string {
    return this.publicoService.urlAcuse(uuid);
  }
}
