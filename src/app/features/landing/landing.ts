import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Icono } from '../../shared/icono/icono';
import { PREGUNTAS, PROCEDIMIENTO, SUPUESTOS_ART_4, URL_LEY } from './landing.contenido';

/** Página de inicio pública: información de la Ley y acceso a la petición de amnistía. */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, Icono],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  protected readonly supuestos = SUPUESTOS_ART_4;
  protected readonly procedimiento = PROCEDIMIENTO;
  protected readonly preguntas = PREGUNTAS;
  protected readonly urlLey = URL_LEY;
  protected readonly anio = new Date().getFullYear();
  protected readonly conSesion: boolean;
  protected readonly compacta = signal(false);
  protected readonly menuAbierto = signal(false);

  constructor(auth: AuthService) {
    this.conSesion = auth.isAuthenticated;
  }

  @HostListener('window:scroll')
  alDesplazar(): void {
    this.compacta.set(window.scrollY > 40);
  }

  ir(seccion: string): void {
    this.menuAbierto.set(false);
    document.getElementById(seccion)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
