/**
 * Fecha de "hoy" en la zona horaria de México Central (America/Mexico_City, UTC-6 fijo desde
 * que México eliminó el horario de verano en 2022), sin importar en qué zona horaria corra el
 * proceso de Node (en producción normalmente UTC). Se usa en vez de `new Date().toISOString()`,
 * que toma la fecha en UTC y puede adelantarse un día entre las 18:00 y 23:59 hora de México.
 */
export function fechaHoyMexico(): string {
  // en-CA formatea como YYYY-MM-DD, exactamente el formato que ya usa el resto del código.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * "Hoy" en México más `dias` días, como YYYY-MM-DD. Arma la fecha a mediodía UTC (no medianoche)
 * para que sumar/restar días con setUTCDate() nunca cruce sin querer a otro día por un ajuste de
 * huso horario, y lee el resultado también en UTC.
 */
export function sumarDiasAHoyMexico(dias: number): string {
  const [anio, mes, dia] = fechaHoyMexico().split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, 12));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY", el formato de fecha usado en el comprobante de pago. */
export function formatoFechaCorta(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** "Hoy" en México, como DD/MM/YYYY. */
export function fechaHoyMexicoCorta(): string {
  return formatoFechaCorta(fechaHoyMexico());
}
