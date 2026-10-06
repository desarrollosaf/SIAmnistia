import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { Icono } from '../icono/icono';

/**
 * Ventana modal controlada por Angular (sin el JS de Bootstrap): se muestra con @if desde el
 * componente padre. Cuerpo y pie se proyectan con [modal-pie] para los botones.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fondo" (click)="cerrarDesdeFondo($event)">
      <div class="ventana" [class.ventana--ancha]="ancho() === 'ancho'" [class.ventana--amplia]="ancho() === 'amplio'" role="dialog" aria-modal="true" [attr.aria-label]="titulo()">
        <header class="ventana__encabezado">
          @if (icono()) {
            <span class="ventana__icono"><app-icono [nombre]="icono()!" /></span>
          }
          <div>
            <h2>{{ titulo() }}</h2>
            @if (subtitulo()) {
              <p>{{ subtitulo() }}</p>
            }
          </div>
          <button type="button" class="ventana__cerrar" (click)="cerrar.emit()" aria-label="Cerrar">
            <app-icono nombre="cruz" />
          </button>
        </header>
        <div class="ventana__cuerpo"><ng-content /></div>
        <footer class="ventana__pie"><ng-content select="[modal-pie]" /></footer>
      </div>
    </div>
  `,
  styles: [`
    .fondo {
      position: fixed; inset: 0; z-index: 1060; display: flex; align-items: center; justify-content: center;
      padding: 1rem; background: rgba(20, 4, 12, 0.5); backdrop-filter: blur(2px); animation: aparecer .15s ease-out;
    }
    .ventana {
      display: flex; flex-direction: column; width: 100%; max-width: 560px; max-height: calc(100vh - 2rem);
      background: #fff; border-radius: 18px; box-shadow: 0 24px 60px rgba(0, 0, 0, .3); animation: subir .2s ease-out;
    }
    .ventana--ancha { max-width: 860px; }
    .ventana--amplia { max-width: 1080px; }
    .ventana__encabezado {
      display: flex; align-items: flex-start; gap: .85rem; padding: 1.25rem 1.4rem 1rem; border-bottom: 1px solid var(--brand-border);
      h2 { margin: 0; font-size: 1.08rem; font-weight: 700; color: var(--brand-ink); }
      p { margin: .2rem 0 0; font-size: .82rem; color: var(--brand-muted); }
      div { flex: 1; min-width: 0; }
    }
    .ventana__icono {
      display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
      background: var(--brand-primary-soft); color: var(--brand-primary);
    }
    .ventana__cerrar {
      display: grid; place-items: center; width: 34px; height: 34px; border: none; border-radius: 10px;
      background: none; color: var(--brand-muted); cursor: pointer;
      &:hover { background: var(--brand-bg); color: var(--brand-ink); }
    }
    .ventana__cuerpo { padding: 1.25rem 1.4rem; overflow-y: auto; }
    .ventana__pie {
      display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .6rem; padding: 1rem 1.4rem 1.25rem;
      border-top: 1px solid var(--brand-border);
      &:empty { display: none; }
    }
    @keyframes aparecer { from { opacity: 0; } to { opacity: 1; } }
    @keyframes subir { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
  `],
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
  readonly icono = input<string | null>(null);
  readonly ancho = input<'normal' | 'ancho' | 'amplio'>('normal');
  readonly cerrar = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrar.emit();
  }

  cerrarDesdeFondo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) this.cerrar.emit();
  }
}
