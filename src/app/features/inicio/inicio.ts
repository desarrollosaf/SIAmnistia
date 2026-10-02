import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ResumenSolicitudes, SolicitudesService } from '../../core/services/solicitudes.service';
import { Icono } from '../../shared/icono/icono';

const ICONOS: Record<string, string> = {
  REGISTRADA: 'bandeja',
  'EN EVALUACIÓN': 'reloj',
  TERMINADA: 'checkCirculo',
  'NO PROCEDE': 'cruzCirculo',
  CONCLUIDA: 'escudo',
};

const TONOS: Record<string, string> = {
  REGISTRADA: 'azul',
  'EN EVALUACIÓN': 'ambar',
  TERMINADA: 'verde',
  'NO PROCEDE': 'rojo',
  CONCLUIDA: 'teal',
};

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink, Icono],
  template: `
    <section class="pagina">
      <header class="bienvenida">
        <div>
          <span class="bienvenida__eyebrow">{{ user()?.institucion }}</span>
          <h1>Hola, {{ user()?.nombre }}</h1>
          <p>Resumen de las solicitudes de amnistía {{ esLegislativo() ? 'registradas en el sistema' : 'turnadas a tu institución' }}.</p>
        </div>
        <a class="btn btn--primary" routerLink="/solicitudes"><app-icono nombre="bandeja" /> Ir a solicitudes</a>
      </header>

      @if (resumen()?.turnosPendientes) {
        <a class="alerta" routerLink="/solicitudes">
          <app-icono nombre="alerta" />
          <span>Tienes <strong>{{ resumen()!.turnosPendientes }}</strong> {{ resumen()!.turnosPendientes === 1 ? 'turno pendiente' : 'turnos pendientes' }} de atender (acuse de recepción u opinión consultiva).</span>
          <app-icono nombre="flechaDer" />
        </a>
      }

      <div class="kpis">
        <a class="kpi kpi--total" routerLink="/solicitudes">
          <span class="kpi__icono"><app-icono nombre="grafica" /></span>
          <span class="kpi__valor">{{ cargando() ? '—' : resumen()?.total ?? 0 }}</span>
          <span class="kpi__etiqueta">Total</span>
        </a>
        @for (e of estatus(); track e.id) {
          <a class="kpi" [attr.data-tono]="tono(e.nombre)" routerLink="/solicitudes" [queryParams]="{ estatus: e.id }">
            <span class="kpi__icono"><app-icono [nombre]="icono(e.nombre)" /></span>
            <span class="kpi__valor">{{ e.total }}</span>
            <span class="kpi__etiqueta">{{ e.nombre }}</span>
          </a>
        }
      </div>
    </section>
  `,
  styles: [`
    .bienvenida {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 1.75rem; border-radius: 20px; color: #fff;
      background: linear-gradient(135deg, var(--brand-primary-dark), var(--brand-primary) 70%, #b0185d);
      box-shadow: 0 18px 40px rgba(90, 0, 43, .22);
      h1 { margin: .25rem 0 .35rem; font-size: 1.6rem; font-weight: 800; }
      p { margin: 0; opacity: .9; font-size: .92rem; }
      .btn--primary { background: #fff; color: var(--brand-primary); box-shadow: none; }
    }
    .bienvenida__eyebrow { font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .8; }
    .alerta {
      display: flex; align-items: center; gap: .75rem; padding: 1rem 1.25rem; border-radius: 14px;
      background: #fff4e0; border: 1px solid rgba(199, 119, 0, .35); color: #7a4a00; text-decoration: none; font-size: .9rem;
      span { flex: 1; }
      &:hover { border-color: var(--brand-amber); }
    }
    .kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 1rem; }
    .kpi {
      --tono: var(--brand-primary); --fondo: var(--brand-primary-soft);
      display: flex; flex-direction: column; gap: .35rem; padding: 1.25rem; border-radius: 16px; background: #fff;
      border: 1px solid var(--brand-border); text-decoration: none; color: var(--brand-ink);
      box-shadow: 0 8px 24px rgba(0, 0, 0, .04); transition: transform .15s, box-shadow .15s, border-color .15s;
      &:hover { transform: translateY(-2px); border-color: var(--tono); box-shadow: 0 14px 28px rgba(0, 0, 0, .08); }
    }
    .kpi[data-tono='azul'] { --tono: var(--brand-blue); --fondo: #e8f0fc; }
    .kpi[data-tono='ambar'] { --tono: var(--brand-amber); --fondo: #fff4e0; }
    .kpi[data-tono='verde'] { --tono: #1a8a4a; --fondo: #e6f5ec; }
    .kpi[data-tono='rojo'] { --tono: var(--brand-danger); --fondo: var(--brand-danger-bg); }
    .kpi[data-tono='teal'] { --tono: #11756f; --fondo: #e4f3f3; }
    .kpi__icono { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: var(--fondo); color: var(--tono); }
    .kpi__valor { font-size: 2rem; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .kpi__etiqueta { font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--brand-muted); }
  `],
})
export class Inicio {
  protected readonly user;
  protected readonly esLegislativo;
  protected readonly resumen = signal<ResumenSolicitudes | null>(null);
  protected readonly cargando = signal(true);
  protected readonly estatus = computed(() => this.resumen()?.estatus ?? []);

  constructor(authService: AuthService, solicitudesService: SolicitudesService) {
    this.user = authService.currentUser;
    this.esLegislativo = authService.esLegislativo;
    solicitudesService.resumen().subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  icono(nombre: string): string {
    return ICONOS[nombre] ?? 'documento';
  }

  tono(nombre: string): string {
    return TONOS[nombre] ?? 'azul';
  }
}
