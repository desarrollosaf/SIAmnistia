import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Trazos (24x24, stroke) de los íconos del sistema. Un solo lugar en vez de SVG repetidos. */
const TRAZOS: Record<string, string[]> = {
  persona: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
  personas: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M2.5 20a6.5 6.5 0 0 1 13 0', 'M16 4.5a3.5 3.5 0 0 1 0 6.5', 'M18 14.2a6.5 6.5 0 0 1 3.5 5.8'],
  casa: ['M4 11.5 12 5l8 6.5', 'M6 10v9.5h12V10', 'M10 19.5v-5h4v5'],
  telefono: ['M5 4h3.5l1.5 4-2 1.5a10 10 0 0 0 6.5 6.5L16 14l4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z'],
  carpeta: ['M3.5 7.5A1.5 1.5 0 0 1 5 6h4.5l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v8.8A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-11Z'],
  documento: ['M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z', 'M14 3v5h5', 'M8.5 13h7M8.5 16.5h5'],
  nota: ['M5 4h14v16H5z', 'M8.5 8.5h7M8.5 12h7M8.5 15.5h4'],
  balanza: ['M12 4v16', 'M7 20h10', 'M5 7h14', 'M5 7l-2.5 6a3 3 0 0 0 5 0L5 7Z', 'M19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z'],
  flechaDer: ['M5 12h14M13 6l6 6-6 6'],
  flechaIzq: ['M19 12H5M11 6l-6 6 6 6'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  checkCirculo: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M8.5 12.3l2.4 2.4 4.6-4.7'],
  cruz: ['M6 6l12 12M18 6L6 18'],
  cruzCirculo: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M9 9l6 6M15 9l-6 6'],
  mas: ['M12 5v14M5 12h14'],
  basura: ['M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7'],
  lapiz: ['M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z'],
  ojo: ['M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  pdf: ['M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z', 'M14 3v5h5', 'M8 17v-4h1.5a1.2 1.2 0 0 1 0 2.4H8M13 13v4h1a2 2 0 0 0 0-4h-1'],
  subir: ['M12 15V4M8 8l4-4 4 4', 'M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15'],
  descargar: ['M12 4v11M8 11l4 4 4-4', 'M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15'],
  buscar: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'm20 20-3.2-3.2'],
  reloj: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7.5V12l3 2'],
  pausa: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M10 9v6M14 9v6'],
  copias: ['M8 8h11v12H8z', 'M5 16V5a1 1 0 0 1 1-1h10'],
  enviar: ['M4 12 20 4l-4 16-4-7-8-1Z', 'M12 13l8-9'],
  alerta: ['M12 9v4m0 4h.01', 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5M12 8v.01'],
  ayuda: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M9.5 9.3a2.5 2.5 0 0 1 4.9.7c0 1.7-2.4 1.9-2.4 3.4', 'M12 16.5v.01'],
  correo: ['M3.5 6.5 12 12l8.5-5.5', 'M4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9A1.5 1.5 0 0 1 4.5 6Z'],
  candado: ['M5 10.5h14v9H5z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'],
  escudo: ['M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3Z', 'M9 12l2 2 4-4'],
  bandeja: ['M3.5 13.5 6 5h12l2.5 8.5', 'M3.5 13.5V19h17v-5.5h-5l-1.5 2h-4l-1.5-2h-5Z'],
  grafica: ['M4 20V10M10 20V4M16 20V13M22 20V7'],
  ajustes: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z'],
  salir: ['M9 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H9', 'M14 8l4.5 4-4.5 4M18.2 12H9.5'],
  excel: ['M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z', 'M14 3v5h5', 'M9 12l5 6M14 12l-5 6'],
  lista: ['M4 7h16M4 12h16M4 17h16'],
  martillo: ['M14 4.5 19.5 10l-3 3L11 7.5l3-3Z', 'M12.5 9 4 17.5 6.5 20 15 11.5', 'M3.5 21h8'],
};

@Component({
  selector: 'app-icono',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" [attr.stroke-width]="grosor()">
      @for (d of trazos(); track $index) {
        <path [attr.d]="d" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
      }
    </svg>
  `,
  styles: [`:host { display: inline-flex; width: 18px; height: 18px; flex-shrink: 0; } svg { width: 100%; height: 100%; }`],
})
export class Icono {
  readonly nombre = input.required<string>();
  readonly grosor = input(1.8);
  protected readonly trazos = computed(() => TRAZOS[this.nombre()] ?? []);
}
