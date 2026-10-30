import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PublicoService } from '../../core/services/publico.service';
import { Icono } from '../icono/icono';

/**
 * Cortina a pantalla completa mientras el registro de solicitudes está cerrado (REGISTRO_ABIERTO=false
 * en el backend). Cubre la página desde el inicio y solo se quita cuando el backend confirma que el
 * registro está abierto: si la consulta se cancela (Esc al recargar) o falla, la cortina permanece.
 */
@Component({
  selector: 'app-cortina',
  standalone: true,
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!abierto()) {
      <div class="cortina" role="alertdialog" aria-modal="true" aria-labelledby="cortina-titulo">
        @if (respondio()) {
        <div class="cortina__caja">
          <span class="cortina__icono"><app-icono nombre="alerta" /></span>
          <h2 id="cortina-titulo">Registro de solicitudes no disponible</h2>
          <p>Por el momento no se están recibiendo solicitudes de amnistía. Cuando se habilite el registro, podrás presentar tu petición en esta misma página.</p>
        </div>
        }
      </div>
    }
  `,
  styles: [`
    .cortina {
      position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 1rem;
      background: rgba(31, 16, 26, .88); backdrop-filter: blur(6px);
    }
    .cortina__caja {
      max-width: 520px; padding: 2rem 1.75rem; border-radius: 20px; background: #fff; text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, .35);
      h2 { margin: .75rem 0 .5rem; font-size: 1.35rem; color: var(--brand-ink); }
      p { margin: 0; color: var(--brand-muted); line-height: 1.55; }
    }
    .cortina__icono {
      display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 16px;
      background: #fbeaf1; color: var(--brand-primary); font-size: 1.6rem;
    }
  `],
})
export class Cortina {
  protected readonly abierto = signal(false);
  /** Ya hubo respuesta (o error): mientras tanto la cortina va lisa, sin mensaje. */
  protected readonly respondio = signal(false);

  constructor() {
    inject(PublicoService).estado().subscribe({
      next: (e) => {
        this.abierto.set(e.registroAbierto);
        this.respondio.set(true);
      },
      error: () => this.respondio.set(true),
    });
  }
}
