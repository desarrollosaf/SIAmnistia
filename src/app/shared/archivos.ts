import { Observable } from 'rxjs';

/**
 * Abre en otra pestaña un archivo que se descarga con sesión (no se puede abrir con una liga
 * directa porque requiere el token). La pestaña se abre antes de la petición para que el
 * navegador no la bloquee como ventana emergente.
 */
export function abrirArchivo(descarga: Observable<Blob>, alFallar: () => void): void {
  const ventana = window.open('', '_blank');
  descarga.subscribe({
    next: (blob) => {
      const url = URL.createObjectURL(blob);
      if (ventana) ventana.location.href = url;
      else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    error: () => {
      ventana?.close();
      alFallar();
    },
  });
}

/** Descarga un blob con el nombre indicado. */
export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const MAX_PDF_MB = 125;

/** Valida que el archivo sea PDF y no exceda el tamaño permitido; devuelve el error o null. */
export function validarPdf(archivo: File): string | null {
  if (!archivo.name.toLowerCase().endsWith('.pdf') && archivo.type !== 'application/pdf') {
    return `"${archivo.name}" no es un archivo PDF.`;
  }
  if (archivo.size > MAX_PDF_MB * 1024 * 1024) {
    return `"${archivo.name}" supera los ${MAX_PDF_MB} MB permitidos.`;
  }
  return null;
}

/** Clase CSS de la etiqueta de estatus (ver .estatus en styles.scss). */
export function claseEstatus(estatus: string | null | undefined): string {
  const e = (estatus ?? '').toUpperCase();
  if (e.includes('REGISTRADA')) return 'estatus estatus--registrada';
  if (e.includes('EVALUACI')) return 'estatus estatus--evaluacion';
  if (e.includes('CONCLUIDA')) return 'estatus estatus--concluida';
  if (e.includes('TERMINADA')) return 'estatus estatus--terminada';
  if (e.includes('NO PROCEDE')) return 'estatus estatus--no-procede';
  if (e.includes('PREVENCI')) return 'estatus estatus--prevencion';
  if (e.includes('TURNADA')) return 'estatus estatus--turnada';
  return 'estatus';
}
