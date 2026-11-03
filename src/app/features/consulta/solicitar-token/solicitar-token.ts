import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PublicoService } from '../../../core/services/publico.service';
import { mensajeError } from '../../../core/interceptors/auth.interceptor';
import { Icono } from '../../../shared/icono/icono';

/** El peticionario captura su correo y recibe una liga temporal para ver sus solicitudes. */
@Component({
  selector: 'app-solicitar-token',
  standalone: true,
  imports: [FormsModule, RouterLink, Icono],
  template: `
    <section class="consulta panel">
      <span class="consulta__icono"><app-icono nombre="buscar" /></span>
      <h1>Consulta de solicitudes</h1>
      @if (enviado()) {
        <div class="consulta__ok">
          <app-icono nombre="correo" />
          <p>
            Enviamos a <strong>{{ email }}</strong> una liga de acceso a tus solicitudes. Tiene una vigencia de
            {{ minutos() }} minutos. Revisa también tu carpeta de correo no deseado.
          </p>
        </div>
        <button type="button" class="btn btn--outline" (click)="enviado.set(false)">Usar otro correo</button>
      } @else {
        <div class="consulta__modos" role="tablist">
          <button type="button" role="tab" [class.activo]="modo() === 'correo'" (click)="cambiarModo('correo')">Por correo</button>
          <button type="button" role="tab" [class.activo]="modo() === 'folio'" (click)="cambiarModo('folio')">Por folio</button>
        </div>
        @if (modo() === 'folio') {
          <p class="consulta__texto">Escribe el número de folio de tu solicitud (por ejemplo 3/{{ anioActual }}) para ver su estatus.</p>
          <form (ngSubmit)="consultarFolio()" class="consulta__form">
            <label class="form-label" for="folio">Folio de la solicitud</label>
            <input id="folio" name="folio" type="text" class="form-control" [(ngModel)]="folio" required [placeholder]="'3/' + anioActual" autocomplete="off" inputmode="numeric" />
            @if (error()) {
              <p class="hint hint--error mt-2">{{ error() }}</p>
            }
            <button type="submit" class="btn btn--primary w-100 mt-3"><app-icono nombre="buscar" /> Consultar solicitud</button>
          </form>
        } @else {
        <p class="consulta__texto">
          Escribe el correo electrónico con el que registraste tu solicitud. Te enviaremos una liga personal y temporal
          para consultar su estatus.
        </p>
        <form (ngSubmit)="solicitar()" class="consulta__form">
          <label class="form-label" for="correo">Correo electrónico</label>
          <input id="correo" name="email" type="email" class="form-control" [(ngModel)]="email" required placeholder="ejemplo@correo.com" autocomplete="email" />
          @if (error()) {
            <p class="hint hint--error mt-2">{{ error() }}</p>
          }
          <button type="submit" class="btn btn--primary w-100 mt-3" [disabled]="cargando()">
            @if (cargando()) { <span class="spinner"></span> Enviando… } @else { <app-icono nombre="enviar" /> Enviar liga de acceso }
          </button>
        </form>
        }
        <p class="consulta__pie">¿Aún no registras tu caso? <a routerLink="/registro">Registra tu solicitud</a></p>
      }
    </section>
  `,
  styles: [`
    .consulta { max-width: 480px; margin: 1.5rem auto; display: flex; flex-direction: column; align-items: center; text-align: center; gap: .5rem; }
    .consulta__icono { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; background: var(--brand-primary-soft); color: var(--brand-primary); }
    .consulta__icono app-icono { width: 28px; height: 28px; }
    h1 { margin: .5rem 0 0; font-size: 1.35rem; font-weight: 800; }
    .consulta__texto { margin: 0 0 .6rem; font-size: .9rem; color: var(--brand-muted); }
    .consulta__modos {
      display: flex; width: 100%; gap: .25rem; padding: .25rem; margin-bottom: .6rem; border-radius: 12px; background: #f1f0f1;
      button { flex: 1; padding: .5rem; border: none; border-radius: 9px; background: none; font-size: .85rem; font-weight: 700; color: var(--brand-muted); cursor: pointer; }
      button.activo { background: #fff; color: var(--brand-primary); box-shadow: 0 1px 4px rgba(0, 0, 0, .12); }
    }
    .consulta__form { width: 100%; text-align: left; }
    .consulta__ok { display: flex; gap: .75rem; padding: 1rem; border-radius: 12px; background: #e6f5ec; color: #1f5f3a; text-align: left; margin: .5rem 0; }
    .consulta__ok app-icono { width: 22px; height: 22px; }
    .consulta__ok p { margin: 0; font-size: .88rem; }
    .consulta__pie { margin: 1rem 0 0; font-size: .85rem; color: var(--brand-muted); }
  `],
})
export class SolicitarToken {
  protected email = '';
  protected folio = '';
  protected readonly anioActual = new Date().getFullYear();
  protected readonly modo = signal<'correo' | 'folio'>('correo');
  protected readonly cargando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly minutos = signal(60);
  protected readonly error = signal<string | null>(null);

  constructor(
    private readonly publicoService: PublicoService,
    private readonly router: Router,
  ) {}

  cambiarModo(modo: 'correo' | 'folio'): void {
    this.modo.set(modo);
    this.error.set(null);
  }

  /** Acepta "3/2026" o solo "3" (se toma el año en curso). */
  consultarFolio(): void {
    const m = /^(\d+)\s*(?:\/\s*(\d{4}))?$/.exec(this.folio.trim());
    if (!m) {
      this.error.set('Captura el folio con el formato 3/' + this.anioActual + '.');
      return;
    }
    this.error.set(null);
    void this.router.navigate(['/consulta/folio', Number(m[1]), m[2] ?? this.anioActual]);
  }

  solicitar(): void {
    const email = this.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error.set('Captura un correo electrónico válido.');
      return;
    }
    this.error.set(null);
    this.cargando.set(true);
    this.publicoService.solicitarToken(email).subscribe({
      next: (r) => {
        this.cargando.set(false);
        this.minutos.set(r.minutos);
        this.enviado.set(true);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(mensajeError(e, 'No se pudo enviar la liga. Intenta más tarde.'));
      },
    });
  }
}
