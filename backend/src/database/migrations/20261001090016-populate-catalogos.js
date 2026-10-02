'use strict';

const { insertarSiVacia } = require('../migration-helpers');
const entidades = require('../catalogos/entidades.json');
const municipios = require('../catalogos/municipios.json');

const conNombre = (nombres) => nombres.map((nombre, i) => ({ id: i + 1, nombre }));

const PARENTESCOS = [
  ['ABU', 'ABUELO(A)'], ['BISA', 'BISABUELO(A)'], ['BISN', 'BISNIETO(A)'],
  ['CONB', 'CONCUBINA O CONCUBINARIO'], ['CONC', 'CONCUÑO(A)'], ['CONY', 'CÓNYUGE'],
  ['CUN', 'CUÑADO(A)'], ['HER', 'HERMANO(A)'], ['HIJ', 'HIJO(A)'], ['MAD', 'MADRE'],
  ['PAD', 'PADRE'], ['PRI', 'PRIMO(A)'], ['SOB', 'SOBRINO(A)'], ['SUE', 'SUEGRO(A)'],
  ['TATA', 'TATARABUELO(A)'], ['TATN', 'TATARANIETO(A)'], ['TIOA', 'TIO(A)'], ['NIE', 'NIETO(A)'],
  ['NIN', 'NINGUNO'], ['AHI', 'AHIJADO(A)'], ['NUE', 'NUERA'], ['YER', 'YERNO'],
  // El formulario detecta "OTRO" por clave para pedir que se especifique el parentesco.
  ['OTRO', 'OTRO(ESPECIFIQUE)'],
];

const RAZONES = [
  [1, 'FAB', 'FABRICACIÓN DEL DELITO'],
  [2, 'DER', 'VIOLACIÓN DE DERECHOS HUMANOS'],
  [3, 'DEB', 'VIOLACIÓN AL DEBIDO PROCESO'],
  [8, '1', 'FABRICACIÓN DEL DELITO, VIOLACIÓN DE DERECHOS HUMANOS'],
  [9, '1', 'FABRICACIÓN DEL DELITO, VIOLACIÓN AL DEBIDO PROCESO'],
  [10, '1', 'VIOLACIÓN DE DERECHOS HUMANOS, VIOLACIÓN AL DEBIDO PROCESO'],
  [11, '1', 'TODAS'],
];

const DELITOS = ['ABORTO', 'CONTRA LA SALUD', 'IMPUTADOS A PERSONAS CAMPESINAS O PERTENECIENTES A LOS PUEBLOS ORIGINARIOS', 'ROBO', 'OTRO'];

const MODALIDADES = [
  [1, 'Se impute a la madre del producto del embarazo interrumpido'],
  [1, 'Se impute a las y los médicos, cirujanos, comadronas o parteras, u otro personal autorizado de servicios de la salud, que hayan auxiliado en la interrupción del embarazo, siempre que la conducta delictiva se haya llevado a cabo sin violencia y con el consentimiento de la madre'],
  [1, 'Se impute a los parientes consanguíneos de la madre del producto que hayan auxiliado en la interrupción del embarazo, y exista consentimiento de la madre'],
  [2, 'Quien lo haya cometido se encuentre en situación de pobreza, o de extrema vulnerabilidad por su condición de exclusión y discriminación'],
  [2, 'El delito se haya cometido por indicación de su cónyuge, concubinario o concubina, pareja sentimental, pariente consanguíneo o por afinidad sin limitación de grado'],
  [2, 'Por temor fundado, así como quien haya sido obligado por grupos de la delincuencia organizada a cometer el delito'],
  [2, 'Quien lo haya cometido pertenezca a un pueblo o comunidad indígena o afromexicana'],
  [3, 'Por defender legítimamente su tierra, recursos naturales, bosques o sus usos y costumbre'],
  [3, 'Durante su proceso no hayan accedido plenamente a la jurisdicción del Estado por no contar con intérpretes o defensores que tuvieran conocimiento de su lengua o cultura'],
  [3, 'Cuando se compruebe que se encuentran en situación de pobreza extrema, notoria inexperiencia y extrema vulnerabilidad'],
  [4, 'Robo simple y sin violencia, cuando el monto de lo robado no exceda de las cuatrocientas veces el valor diario de la UMA vigente, previa reparación del daño'],
  [4, 'Robo con violencia, siempre y cuando concurran circunstancias especiales: delincuente primario, sin lesiones ni armas de fuego, monto no mayor a 90 UMA, con reparación del daño, sin otros procesos pendientes, y el sujeto activo no sea servidor público'],
];

const INSTITUCIONES = [
  ['PODER LEGISLATIVO DEL ESTADO DE MÉXICO', 'legislativo@mail.com'],
  ['COMISIÓN ESTATAL DE LOS DERECHOS HUMANOS', 'comision@mail.com'],
  ['FISCALIA GENERAL DE JUSTICIA DEL ESTADO DE MÉXICO', 'fiscalia@mail.com'],
  ['PODER JUDICIAL DEL ESTADO DE MÉXICO', 'judicial@mail.com'],
  ['INSTITUTO DE LA DEFENSORÍA PÚBLICA DEL ESTADO DE MÉXICO', 'defensoria@mail.com'],
];

/**
 * Valores iniciales de los catálogos, con los mismos ids que en la base de amnistía para que
 * los registros importados sigan apuntando al valor correcto. Solo se insertan en tablas vacías.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await insertarSiVacia(queryInterface, 'instituciones', INSTITUCIONES.map(([nombre_institucion, email_institucion], i) => ({
      id: i + 1, nombre_institucion, email_institucion,
    })));
    await insertarSiVacia(queryInterface, 'roles', ['Super usuario', 'Institucion', 'Revisor', 'Registro'].map((name, i) => ({
      id: i + 1, name, guard_name: 'web',
    })));

    await insertarSiVacia(queryInterface, 'generos', conNombre(['HOMBRE', 'MUJER', 'NO BINARIO', 'NO QUIERO DECIR', 'OTRO']));
    await insertarSiVacia(queryInterface, 'tipos_personas', conNombre(['Solicitante', 'Beneficiario']));
    await insertarSiVacia(queryInterface, 'tipo_solicitantes', conNombre(['FÍSICA', 'JÚRIDICA COLECTIVA']));
    await insertarSiVacia(queryInterface, 'situaciones_juridicas', conNombre(['Procesado', 'Sentenciado', 'Otro']));
    await insertarSiVacia(queryInterface, 'tipos_defensores', conNombre(['Público', 'Privado']));
    await insertarSiVacia(queryInterface, 'perfiles_criminologicos', conNombre(['Reincidente', 'Primodelincuente']));
    await insertarSiVacia(queryInterface, 'niveles_delitos', conNombre(['LOCAL', 'FEDERAL']));
    await insertarSiVacia(queryInterface, 'estatus_solicitudes', conNombre(['REGISTRADA', 'EN EVALUACIÓN', 'TERMINADA', 'NO PROCEDE', 'CONCLUIDA']));
    await insertarSiVacia(queryInterface, 'estatus_turnos', conNombre(['TURNADA', 'EN EVALUACIÓN', 'TERMINADA', 'PREVENCIÓN']));
    await insertarSiVacia(queryInterface, 'tipos_contadores', conNombre(['solicitudes']));
    await insertarSiVacia(queryInterface, 'recomendacion', ['Se recomienda', 'No se recomienda', 'Opinión positiva o negativa', 'Opinión consultiva'].map((estado, i) => ({
      id: i + 1, estado,
    })));
    await insertarSiVacia(queryInterface, 'parentescos', PARENTESCOS.map(([clave, valor], i) => ({ id: i + 1, clave, valor })));
    await insertarSiVacia(queryInterface, 'razones_solicitudes', RAZONES.map(([id, clave, valor]) => ({ id, clave, valor })));

    await insertarSiVacia(queryInterface, 'delitos', DELITOS.map((delito, i) => ({ id: i + 1, delito, obligatorio: false })));
    await insertarSiVacia(queryInterface, 'modalidades_delitos', MODALIDADES.map(([delito_id, nombre], i) => ({
      id: i + 1, delito_id, nombre,
    })));

    await insertarSiVacia(queryInterface, 'entidades', entidades.map((e, i) => ({
      id: i + 1, clave: e.cve_agee, entidad: e.nom_agee, abreviatura: e.abrev_agee,
    })));
    const idEntidadPorClave = new Map(entidades.map((e, i) => [e.cve_agee, i + 1]));
    await insertarSiVacia(queryInterface, 'municipios', municipios.map((m, i) => ({
      id: i + 1,
      clave: m.cve_agem,
      municipio: m.nom_agem,
      entidad_id: idEntidadPorClave.get(m.cve_agee),
      clave_estado: m.cve_agee,
    })));
  },

  async down() {
    // Los catálogos se borran junto con sus tablas en el down de cada migración create-*.
  },
};
