import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icono } from '../../shared/icono/icono';

/** Marco de las páginas públicas (registro de solicitud y consulta del peticionario). */
@Component({
  selector: 'app-publico-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono],
  templateUrl: './publico-layout.html',
  styleUrl: './publico-layout.scss',
})
export class PublicoLayout {
  protected readonly anio = new Date().getFullYear();
}
