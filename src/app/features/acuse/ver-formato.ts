import { Component, OnInit, input } from '@angular/core';
import { PublicoService } from '../../core/services/publico.service';

/**
 * Liga del correo de confirmación: redirige al PDF del formato de solicitud de amnistía que sirve
 * el backend, igual que la liga del acuse.
 */
@Component({
  selector: 'app-ver-formato',
  standalone: true,
  template: `<p style="padding:2rem;text-align:center;color:var(--brand-muted)">Abriendo tu solicitud de amnistía…</p>`,
})
export class VerFormato implements OnInit {
  readonly uuid = input.required<string>();

  constructor(private readonly publicoService: PublicoService) {}

  ngOnInit(): void {
    window.location.replace(this.publicoService.urlFormato(this.uuid()));
  }
}
