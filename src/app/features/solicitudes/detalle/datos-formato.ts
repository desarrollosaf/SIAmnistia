import { DatosFormatoDetalle } from '../../../core/services/solicitudes.service';

export interface DatoEtiquetado {
  etiqueta: string;
  valor: string;
}

const siNo = (v: boolean | undefined) => (v === undefined ? undefined : v ? 'Sí' : 'No');
const fecha = (iso: string | undefined) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : undefined);
const tiempo = (anios: number | undefined, meses: number | undefined) =>
  anios === undefined && meses === undefined ? undefined : `${anios ?? 0} año(s), ${meses ?? 0} mes(es)`;
const dinero = (monto: string | number | undefined) =>
  monto === undefined ? undefined : Number(monto).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const con = (respuesta: string | undefined, detalle: string | undefined) =>
  respuesta && detalle ? `${respuesta}: ${detalle}` : respuesta;

const COMUNIDAD = { INDIGENA: 'Indígena', AFROMEXICANA: 'Afromexicana', NINGUNA: 'Ninguna' };
const LIBERTAD = { PRIVADO: 'Sí, privada(o) de su libertad', NO_PRIVADO: 'No', MEDIDA_SEGURIDAD: 'Bajo una medida de seguridad' };
const RESOLUCION = { CONFIRMO: 'Confirmó', MODIFICO: 'Modificó', REVOCO: 'Revocó' };

/** Se muestran solo las respuestas capturadas. */
function presentes(filas: [string, string | undefined][]): DatoEtiquetado[] {
  return filas.filter((f): f is [string, string] => !!f[1]).map(([etiqueta, valor]) => ({ etiqueta, valor }));
}

/** Datos adicionales del beneficiario (comunidad, salud, ocupación…). */
export function datosAdicionales(d: DatosFormatoDetalle | null): DatoEtiquetado[] {
  if (!d) return [];
  return presentes([
    ['Estado en que se encuentra', d.estadoSeEncuentra],
    ['Fecha en que fue cometido el delito', fecha(d.fechaComisionDelito)],
    ['Pertenece a una comunidad', con(d.comunidad && COMUNIDAD[d.comunidad], d.comunidadIndigenaCual)],
    ['Contó con intérprete durante el proceso', siNo(d.interprete)],
    ['Discapacidad permanente', con(siNo(d.discapacidad), d.discapacidadCual)],
    ['Enfermedad crónico-degenerativa', con(siNo(d.enfermedadCronica), d.enfermedadCronicaCual)],
    ['A qué se dedicaba antes del delito', d.ocupacionPrevia],
    ['Personas que dependen económicamente', d.dependientesEconomicos],
  ]);
}

/** Libertad y situación en el proceso penal (investigación, sentencia, apelación, amparo). */
export function datosProceso(d: DatosFormatoDetalle | null): DatoEtiquetado[] {
  if (!d) return [];
  return presentes([
    ['Privada(o) de su libertad', con(d.situacionLibertad && LIBERTAD[d.situacionLibertad], d.medidaSeguridadCual)],
    ['Averiguación previa o carpeta de investigación', d.investigacionNumero],
    ['Agencia del ministerio público o fiscalía', d.investigacionAgencia],
    ['Pena de la sentencia', tiempo(d.penaAnios, d.penaMeses)],
    ['La pena incluye multa', con(siNo(d.multa), dinero(d.multaMonto))],
    ['Recurso de apelación', siNo(d.apelacion)],
    ['Número de toca penal', d.apelacionToca],
    ['Tribunal que conoce', d.apelacionTribunal],
    ['Resolución de la apelación', d.apelacionResolucion && RESOLUCION[d.apelacionResolucion]],
    ['Se modificó la pena de prisión', siNo(d.penaModificada)],
    ['Tiempo que compurgará en prisión', tiempo(d.penaCompurgarAnios, d.penaCompurgarMeses)],
    ['Juicio de amparo', con(siNo(d.amparo), d.amparoEfectos && `efectos: ${d.amparoEfectos}`)],
    ['El amparo fue concedido', siNo(d.amparoConcedido)],
    ['Sentenciado antes por el mismo delito', siNo(d.sentenciadoAntesMismoDelito)],
    ['Otro proceso vinculado', siNo(d.otroProceso)],
    ['Expediente del otro proceso', d.otroProcesoExpediente],
    ['Juzgado del otro proceso', d.otroProcesoJuzgado],
  ]);
}

/** Titular o representante legal del organismo (persona jurídica colectiva). */
export function titularOrganismo(d: DatosFormatoDetalle | null): string {
  return d ? [d.titularNombre, d.titularPrimerApellido, d.titularSegundoApellido].filter(Boolean).join(' ') : '';
}
