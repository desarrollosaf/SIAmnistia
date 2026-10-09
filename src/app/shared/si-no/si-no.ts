import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let siguienteId = 0;

/** Par de opciones Sí / No para formularios reactivos: el valor es true, false o null (sin responder). */
@Component({
  selector: 'app-si-no',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SiNo), multi: true }],
  template: `
    <div class="si-no" role="radiogroup" [attr.aria-label]="etiqueta()">
      <button type="button" role="radio" [class.activa]="valor() === true" [attr.aria-checked]="valor() === true" [disabled]="deshabilitado()" (click)="elegir(true)">Sí</button>
      <button type="button" role="radio" [class.activa]="valor() === false" [attr.aria-checked]="valor() === false" [disabled]="deshabilitado()" (click)="elegir(false)">No</button>
    </div>
  `,
  styles: [`
    .si-no { display: inline-flex; border: 1px solid var(--brand-border); border-radius: 10px; overflow: hidden; background: #fff; }
    button {
      min-width: 64px; padding: .5rem 1rem; border: 0; background: none; font: inherit; font-size: .88rem; font-weight: 600;
      color: var(--brand-muted); cursor: pointer;
      & + button { border-left: 1px solid var(--brand-border); }
      &:hover:not(:disabled) { background: var(--brand-primary-soft); }
      &.activa { background: var(--brand-primary); color: #fff; }
    }
  `],
})
export class SiNo implements ControlValueAccessor {
  readonly etiqueta = input('');
  protected readonly id = `si-no-${siguienteId++}`;
  protected readonly valor = signal<boolean | null>(null);
  protected readonly deshabilitado = signal(false);

  private alCambiar: (valor: boolean | null) => void = () => undefined;
  private alTocar: () => void = () => undefined;

  writeValue(valor: boolean | null): void {
    this.valor.set(valor ?? null);
  }
  registerOnChange(fn: (valor: boolean | null) => void): void {
    this.alCambiar = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }
  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  /** Volver a elegir la opción activa la deja sin responder. */
  protected elegir(valor: boolean): void {
    const nuevo = this.valor() === valor ? null : valor;
    this.valor.set(nuevo);
    this.alCambiar(nuevo);
    this.alTocar();
  }
}
