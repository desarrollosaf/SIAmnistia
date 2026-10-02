import { Component, OnInit, input } from '@angular/core';
import { PublicoService } from '../../core/services/publico.service';

/**
 * Liga del correo de confirmación: redirige al PDF del acuse que sirve el backend.
 * Vive en el frontend para que la liga del correo use la misma URL pública del sistema.
 */
@Component({
  selector: 'app-ver-acuse',
  standalone: true,
  template: `<p style="padding:2rem;text-align:center;color:var(--brand-muted)">Abriendo tu acuse…</p>`,
})
export class VerAcuse implements OnInit {
  readonly uuid = input.required<string>();

  constructor(private readonly publicoService: PublicoService) {}

  ngOnInit(): void {
    window.location.replace(this.publicoService.urlAcuse(this.uuid()));
  }
}
