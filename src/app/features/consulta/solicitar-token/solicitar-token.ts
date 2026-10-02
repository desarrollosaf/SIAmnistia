import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
    .consulta__form { width: 100%; text-align: left; }
    .consulta__ok { display: flex; gap: .75rem; padding: 1rem; border-radius: 12px; background: #e6f5ec; color: #1f5f3a; text-align: left; margin: .5rem 0; }
    .consulta__ok app-icono { width: 22px; height: 22px; }
    .consulta__ok p { margin: 0; font-size: .88rem; }
    .consulta__pie { margin: 1rem 0 0; font-size: .85rem; color: var(--brand-muted); }
  `],
})
export class SolicitarToken {
  protected email = '';
  protected readonly cargando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly minutos = signal(60);
  protected readonly error = signal<string | null>(null);

  constructor(private readonly publicoService: PublicoService) {}

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
