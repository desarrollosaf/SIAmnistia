'use strict';

/**
 * Genera la guía del usuario (public/assets/manual-amnistia.pdf), que se envía por correo con el acuse.
 *
 *   cd backend && node scripts/generar-manual.js
 *
 * Portada sin encabezado + cuerpo con encabezado y numeración; el índice toma los números de página
 * del marcador (outline) del propio PDF, así que siempre coincide con el contenido.
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PDFDocument, PDFDict, PDFName, PDFArray, PDFRef } = require('pdf-lib');
const { rutaChromium } = require('../dist/common/chromium-path.util');

const RAIZ = path.join(__dirname, '..', '..');
const LOGO = `data:image/png;base64,${fs.readFileSync(path.join(RAIZ, 'public/assets/congreso-edomex-logo.png')).toString('base64')}`;
const SALIDA = path.join(RAIZ, 'public/assets/manual-amnistia.pdf');

const SECCIONES = [
  'Importante',
  '¿Qué es el nuevo sistema de amnistía?',
  'Registro de solicitud',
  'Datos generales del peticionario',
  'Domicilio del peticionario',
  'Contacto del peticionario',
  'Datos del beneficiario',
  'Carpetas',
  'Detalles de la solicitud',
  'Narrativa de los hechos',
  'Guardar la solicitud: acuse y formato de solicitud',
  'Consulta el progreso de la solicitud',
];

const ESTILOS = `
  @page { size: Letter; margin: 26mm 22mm 20mm 22mm; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.5; color: #1f1f21; margin: 0; }
  h2 { font-size: 14px; margin: 22px 0 8px; color: #2b2b2d; }
  h3 { font-size: 11.5px; margin: 14px 0 4px; }
  p { margin: 0 0 8px; text-align: justify; }
  ul { margin: 0 0 10px; padding-left: 22px; } li { margin: 0 0 3px; text-align: justify; }
  ul ul { margin: 3px 0 4px; }
  strong { color: #000; }
  table.nav { border-collapse: collapse; margin: 10px auto 12px; width: 60%; }
  table.nav th { background: #dcdcdc; text-align: left; padding: 7px 10px; border: 1px solid #c8c8c8; }
  table.nav td { padding: 7px 10px; border: 1px solid #d2d2d2; }
  .portada { height: 245mm; position: relative; }
  .portada img.logo { width: 62mm; position: absolute; top: 0; left: 0; }
  .portada .titulo { position: absolute; top: 118mm; left: 22mm; right: 22mm; }
  .portada h1 { font-size: 46px; line-height: 1.05; margin: 0; color: #8a8a8a; font-weight: 800; letter-spacing: -1px; }
  .portada h1 span { display: block; font-weight: 400; font-size: 42px; }
  .portada .linea { height: 3px; background: #8b0a4a; margin: 22px 0 16px; }
  .portada p { font-size: 23px; line-height: 1.25; color: #8a8a8a; margin: 0; text-align: left; }
  .portada .guia { margin-top: 30px; font-size: 14px; letter-spacing: .5px; color: #6b6b6b; }
  .indice h2 { margin-top: 0; }
  .indice .fila { display: flex; align-items: baseline; margin: 0 0 9px; }
  .indice .fila span.t { white-space: nowrap; }
  .indice .fila span.p { flex: 1; border-bottom: 1px dotted #555; margin: 0 4px; transform: translateY(-3px); }
  .indice .fila span.n { white-space: nowrap; }
  .paso { margin: 0 0 8px; }
  .nota { background: #f6eef2; border-left: 3px solid #8b0a4a; padding: 7px 10px; margin: 8px 0 10px; }
  .nota p { margin: 0; }
  .salto { page-break-before: always; }
  h2, h3 { page-break-after: avoid; } li, .paso { page-break-inside: avoid; }
`;

const li = (...items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

const CUERPO = `
<h2>Importante</h2>
<p>Es indispensable que cuente con los siguientes elementos:</p>
${li('Cuenta de correo electrónico personal, a la que tenga acceso: ahí recibirá su acuse y las notificaciones.', 'Internet con una velocidad mayor a los 3 Mbps o, en su defecto, una conexión de datos móviles de celular.')}
<p>Puede acceder a la plataforma desde cualquier dispositivo con acceso a internet: computadora de escritorio, laptop, tableta o celular, a través de los navegadores de internet recomendados:</p>
<table class="nav"><tr><th>Navegador</th><th>Versión</th></tr>
<tr><td>Google Chrome</td><td>Actualizada</td></tr><tr><td>Mozilla Firefox</td><td>Actualizada</td></tr>
<tr><td>Microsoft Edge</td><td>Actualizada</td></tr><tr><td>Safari</td><td>Actualizada</td></tr></table>
<p>Para una mejor experiencia de uso se recomienda:</p>
${li('Utilizar un navegador actualizado.', 'Permitir las descargas de archivos: al terminar el registro el sistema descarga su acuse y su formato de solicitud, y algunos navegadores piden autorización para descargar más de un archivo.', 'Tener las cookies activadas.', 'Una resolución de pantalla de 1024 x 768 píxeles o mayor.', 'Tener instalado un programa que permita visualizar archivos PDF para consultar los documentos que emite la aplicación (por ejemplo, Adobe Reader o el visor de su navegador).', 'La plataforma solo permite adjuntar archivos en formato PDF.')}
<p>Si tiene dudas, comuníquese con personal del Departamento de Desarrollo y Actualización Tecnológica de la Secretaría de Administración y Finanzas al número 72.22.79.64.00 ext. 5405.</p>
<p>Durante el llenado de la solicitud es conveniente que, al momento de la captura, se disponga de la siguiente documentación en formato digital .pdf:</p>
${li('Identificación oficial (INE por ambos lados) del peticionario (a); para instituciones u organismos, acta constitutiva o poder notarial.', 'Constancia de la Clave Única de Registro de Población (CURP) del beneficiario (a), emitida por la Secretaría de Gobernación, y su número de 18 caracteres.', 'Acta de nacimiento del peticionario (a), si tiene parentesco con el beneficiario (a).', 'Sentencia definitiva, si el beneficiario (a) ya fue sentenciado (a).', 'Datos generales de la o las carpetas de investigación o causas penales iniciadas en contra del beneficiario (a).', 'De manera opcional, los documentos de apoyo que se describen en la sección Datos del beneficiario.')}

<h2>¿Qué es el nuevo sistema de amnistía?</h2>
<p>La Ley de Amnistía del Estado de México busca beneficiar a personas que estén vinculadas a proceso, o que se les haya dictado sentencia firme ante juzgados locales o federales, por los delitos señalados en la misma y que hayan sido cometidos hasta la fecha de su entrada en vigor, siempre y cuando no exista reincidencia.</p>
<p>La Comisión de Amnistía del Poder Legislativo conoce aquellos casos que por su relevancia son puestos a su consideración, en los que acredite debidamente que existe violación de derechos o fallas en la aplicación de alguno de los principios penales del sistema acusatorio, o la plena presunción de fabricación de delitos.</p>
<p>Las personas que se encuentren sustraídas de la acción de la justicia por delitos a que se refiere la Ley de Amnistía del Estado de México, podrán también beneficiarse mediante la solicitud correspondiente presentada ante el Poder Judicial del Estado de México.</p>

<h2>Registro de solicitud</h2>
<p class="paso"><strong>Paso 1:</strong> Para registrar una solicitud de amnistía, dirigirse al portal del Poder Legislativo del Estado de México con URL: legislativoedomex.gob.mx/amnistia, identifique el banner de Ley de Amnistía del Estado de México y dé clic.</p>
<p class="paso"><strong>Paso 2:</strong> En la nueva pantalla encontrará información referente al proceso de solicitud de amnistía. Antes de continuar, lea atenta y cuidadosamente cada sección de este portal informativo. Para registrar una solicitud busque en el menú superior el botón <strong>Petición de amnistía</strong> (o <strong>Registrar solicitud</strong>) y dé clic para ingresar.</p>
<p class="paso"><strong>Paso 3:</strong> Antes de comenzar, el formulario pide dos confirmaciones. Marque las casillas <strong>Acepto el aviso de privacidad y el uso de la información</strong> (puede consultar el aviso dando clic en su nombre) y <strong>Declaro que esta solicitud corresponde a la Ley de Amnistía del Estado de México</strong>. Hasta que ambas estén marcadas no se muestra el formulario.</p>
<p>El formulario se llena en <strong>7 pasos</strong>: Peticionario, Domicilio, Contacto, Beneficiario, Carpetas, Solicitud y Narrativa. En la parte superior se muestra en qué paso se encuentra y puede regresar a los anteriores. Cada paso tiene un botón <strong>Ayuda</strong> con una explicación de lo que debe capturar. Los campos marcados con asterisco (*) son obligatorios. Al concluir cada paso presione <strong>Siguiente</strong>; para revisar la información del paso anterior presione <strong>Regresar</strong>.</p>

<h2>Datos generales del peticionario</h2>
<p>Seleccione el tipo de peticionario: <strong>persona física</strong> o <strong>persona jurídica colectiva</strong>, e ingrese la información que se solicita.</p>
<h3>Persona física</h3>
${li('<strong>Nombre(s), primer y segundo apellidos.</strong> Escriba el nombre o los nombres completos, así como los apellidos completos, sin abreviaturas ni signos especiales. Si tiene un solo apellido, deberá colocarse en el espacio del primer apellido y dejar el segundo apellido en blanco.', '<strong>Género.</strong> Seleccione el género del peticionario. Si elige <em>Otro</em>, especifique cuál.', '<strong>Tengo relación o parentesco con el beneficiario.</strong> Marque esta casilla si es familiar del beneficiario: seleccione el parentesco de la lista (si no aparece, elija <em>Otro</em> y especifíquelo) y adjunte su <strong>acta de nacimiento</strong> en PDF, que lo acredita.', '<strong>Si no tiene parentesco</strong> (la solicitud se presenta como representante legal), puede adjuntar, de forma opcional, la <strong>documental pública o el escrito firmado por la persona interesada</strong> mediante el cual lo designa como representante legal para el trámite de amnistía.', '<strong>Identificación oficial / poder notarial.</strong> Anexe su identificación oficial (INE) por ambos lados, en PDF.')}
<h3>Persona jurídica colectiva</h3>
<p>Son las constituidas conforme a la ley, por grupos de individuos a las cuales el derecho considera como una sola entidad para ejercer derechos y asumir obligaciones, por ejemplo, un organismo público defensor de derechos humanos.</p>
${li('<strong>Nombre.</strong> Proporcione el nombre completo de la Institución u Organismo que fungirá como representante del beneficiario.', '<strong>RFC.</strong> Proporcione el Registro Federal de Contribuyentes de la Institución u Organismo.', '<strong>Titular o representante legal del organismo.</strong> Capture su nombre(s) y apellidos. Esta persona es quien firma la solicitud de amnistía.', '<strong>Autorización al organismo</strong> (opcional). Adjunte la documental pública o el escrito firmado por la persona interesada mediante el cual autoriza al organismo a realizar el trámite en su representación.', '<strong>Documental que acredita al titular</strong> (opcional). Adjunte copia simple o certificada del documento que lo acredita como titular o representante legal del organismo y escriba qué documento es (por ejemplo, nombramiento o poder notarial).', '<strong>Identificación oficial / poder notarial.</strong> Anexe la identificación o el acta constitutiva que acredite la identidad de la Institución u Organismo representante, en PDF.')}

<h2>Domicilio del peticionario</h2>
<p>Proporcione los datos relativos al lugar en el que reside actualmente la persona, Institución u Organismo peticionario.</p>
${li('<strong>Calle.</strong> Proporcione el nombre.', '<strong>Número exterior.</strong> Proporcione el número exterior del domicilio.', '<strong>Número interior (si aplica).</strong> Si el inmueble no cuenta con número interior, el campo puede dejarse en blanco.', '<strong>Colonia.</strong> Proporcione el nombre de la colonia o localidad donde se encuentra el domicilio.', '<strong>Código postal.</strong> Opcional; cinco dígitos.', '<strong>Entidad federativa.</strong> Seleccione de la lista la entidad donde se localiza el domicilio.', '<strong>Municipio o alcaldía.</strong> Se habilita al elegir la entidad; seleccione el que corresponda.')}

<h2>Contacto del peticionario</h2>
<p>Deberá proporcionar los datos relativos al medio electrónico para contactar al peticionario.</p>
${li('<strong>Correo electrónico personal.</strong> En esta cuenta se enviará el acuse de su solicitud, su formato de solicitud de amnistía y las notificaciones que sean necesarias. Con este mismo correo podrá consultar el progreso de su solicitud. En caso de no contar con uno, deberá generar una cuenta.', '<strong>Teléfono de casa.</strong> Escriba el número telefónico a diez dígitos, sin espacios ni guiones.', '<strong>Celular personal.</strong> Escriba los diez dígitos de su número celular.')}

<h2>Datos del beneficiario</h2>
<p>Proporcione los datos del beneficiario. Se deberá entender por beneficiaria o beneficiario a la persona privada de su libertad o que se encuentra sujeta a proceso.</p>
${li('<strong>Nombre(s), primer y segundo apellidos.</strong> Escriba el nombre o nombres, así como los apellidos completos, sin abreviaturas ni signos especiales. Si tiene un solo apellido, deberá colocarse en el espacio del primer apellido y dejar el segundo apellido en blanco.', '<strong>Fecha de nacimiento.</strong> Seleccione la fecha de nacimiento del beneficiario (a).', '<strong>Género.</strong> Seleccione el género del beneficiario (a). Si elige <em>Otro</em>, especifique cuál.', '<strong>CURP.</strong> Ingrese la Clave Única de Registro de Población (CURP) del beneficiario (a), de 18 caracteres.', '<strong>Constancia de CURP.</strong> Adjunte la constancia de CURP del beneficiario (a) en PDF.')}
<h3>Datos adicionales del beneficiario (opcionales)</h3>
<p>Debajo de los datos anteriores encontrará una serie de preguntas opcionales. Capture las que conozca; esta información se imprime en el formato de solicitud de amnistía que genera el sistema y ayuda al análisis del caso. En las preguntas de <em>Sí / No</em>, si vuelve a presionar la opción elegida la deja sin responder.</p>
<ul>
<li><strong>Datos adicionales.</strong> Estado en que se encuentra; fecha en que fue cometido el delito; si pertenece a una comunidad indígena (y cuál), afromexicana o ninguna; si contó con un intérprete durante su proceso; si tiene una discapacidad permanente o una enfermedad crónico-degenerativa (y cuál); a qué se dedicaba antes de cometer el delito; y cuántas y quiénes son las personas que dependen económicamente de él (ella).</li>
<li><strong>Libertad y situación en el proceso.</strong> Si se encuentra privado (a) de su libertad, no lo está o se encuentra bajo una medida de seguridad (y cuál); y, si está siendo investigado (a), el número de averiguación previa o carpeta de investigación y la agencia del ministerio público, procuraduría o fiscalía que conoce del caso.</li>
<li><strong>Sentencia.</strong> Pena impuesta en años y meses y si incluye el pago de una multa (y su monto).</li>
<li><strong>Segunda instancia, amparo y otros procesos.</strong> Si se presentó recurso de apelación (número de toca penal, tribunal que conoce, resolución —confirmó, modificó o revocó— y si se modificó la pena de prisión); si se presentó juicio de amparo (para qué efectos y si fue concedido); si fue sentenciado (a) anteriormente por el mismo delito; y si tiene otro proceso vinculado (número de expediente y juzgado).</li>
</ul>
<h3>Documentación de apoyo (PDF, opcional)</h3>
<p>Puede adjuntar los documentos que respalden la solicitud, cada uno en PDF: averiguación previa o carpeta de investigación; constancias del proceso penal ante el juez, sentencia de primera instancia, segunda instancia o amparo; documento que acredita la no reincidencia respecto al delito por el que solicita el beneficio; documento que acredita la situación socioeconómica; y documento que acredita la calidad de indígena.</p>
<p>Si desea adjuntar otros documentos, marque la casilla <strong>Otro documento</strong>: seleccione el archivo PDF, escriba una <strong>descripción</strong> del documento y, si necesita más, presione <strong>Agregar otro documento</strong> (hasta 10). Cada archivo debe llevar su descripción.</p>

<h2>Carpetas</h2>
<p>Deberá registrar los datos generales de la o las carpetas de investigación o causas penales iniciadas en contra del beneficiario (a).</p>
${li('<strong>Núm. de carpeta o causa.</strong> Escriba el folio de la carpeta de investigación o de la causa penal.', '<strong>Razón de la solicitud.</strong> Seleccione de las opciones desplegables el motivo por el que solicita el análisis de su solicitud.', '<strong>Conozco la ubicación de la violación en el expediente.</strong> Si marca esta casilla, indique el <strong>tomo</strong> y la <strong>foja</strong> (número de hoja) donde se encuentra la razón de la solicitud.')}
<p>Al concluir esta sección presione <strong>Agregar carpeta</strong>; la información registrada aparecerá en el lado derecho. Enseguida deberá registrar los delitos por los cuales es acusado el beneficiario (a): en la carpeta presione el botón <strong>Delitos</strong>. Se desplegará una ventana con la lista de delitos, cada uno como un bloque que se abre al seleccionarlo:</p>
${li('Abra el delito que corresponda y elija <strong>una modalidad</strong> (supuesto de la Ley de Amnistía), marcando su casilla. Al abrir otro delito se descarta la selección anterior.', 'Si el delito no está en la lista, abra la opción <strong>OTRO</strong> y escriba el nombre del delito.', 'Presione <strong>Agregar delito</strong>. El botón permanece visible en la parte inferior de la ventana aunque se desplace por la lista. Repita para cada delito de la carpeta.', 'Cuando termine, presione <strong>Listo</strong>.')}
<p>Cada carpeta debe tener al menos un delito. Para quitar una carpeta o un delito agregado utilice el icono de basura.</p>

<h2>Detalles de la solicitud</h2>
<p>Deberá registrar los datos generales de la solicitud y de la causa penal por la cual se inició el procedimiento.</p>
${li('<strong>CPRS.</strong> Indique el Centro Preventivo y de Readaptación Social donde se encuentra la persona privada de su libertad.', '<strong>Situación jurídica.</strong> Seleccione la situación jurídica actual del beneficiario (a). Las opciones las administra la Comisión; por ejemplo: <ul><li><strong>Investigada.</strong> Cuando el beneficiario (a) está siendo investigado (a) por el Ministerio Público.</li><li><strong>Procesado.</strong> Cuando el imputado (a) está enfrentando un proceso penal que no ha culminado.</li><li><strong>Sentenciado.</strong> Cuando se haya dictaminado la pena o sanción correspondiente al beneficiario (a). En este caso deberá adjuntar la <strong>sentencia definitiva</strong> en PDF.</li><li><strong>Otro.</strong> Para especificar una situación distinta.</li></ul>', '<strong>Tipo de defensor.</strong> Indique si el defensor del beneficiario (a) es público o privado. <em>Público:</em> cuando el defensor haya sido designado por el Juez de Control. <em>Privado:</em> cuando haya sido seleccionado por el propio imputado (a) o sus familiares.', '<strong>Juzgado.</strong> Indique en qué tribunal u órgano jurisdiccional se llevó o se lleva a cabo su proceso penal.', '<strong>Perfil criminológico.</strong> Primodelincuente: es la primera vez que comete un delito. Reincidente: ya ha cometido el mismo delito en otro momento o cualquier otro.', '<strong>Nivel del delito.</strong> Indique si el delito fue cometido a nivel local o federal.', '<strong>Procedimiento abreviado.</strong> Seleccione si se trata de un procedimiento abreviado. Entiéndase por procedimiento abreviado si durante la audiencia de preparación, el imputado, asesorado por su abogado, podrá renunciar libre e informadamente a su derecho de tener un juicio oral, aceptando expresamente los hechos contenidos en la acusación y los antecedentes en que se funda la investigación.')}

<h2>Narrativa de los hechos</h2>
<p>Puede adjuntar un archivo en formato PDF (hasta 125 MB, en escala de grises a 150 dpi) con la verdad jurídica, la verdad de los hechos y la justificación donde se describa la presunta violación; además, cuenta con dos recuadros de texto para redactar directamente.</p>
${li('<strong>Verdad jurídica.</strong> Son los hechos y las actuaciones señaladas por la autoridad, que puede ser el Ministerio Público, la Policía de Investigación, etc., por los cuales se determina la comisión de un delito y que son por los que se lleva a cabo la detención.', '<strong>Verdad histórica.</strong> Se refiere a la narración de su verdad sobre los hechos por parte del procesado o sentenciado y que, conforme a su dicho, son los que realmente ocurrieron.', '<strong>Justificación.</strong> Es la razón de su petición y es necesario especificar cuándo se realiza la violación. Puede ser la violación al debido proceso o a los derechos humanos (es necesario especificar cuál es la violación y en qué etapa ocurrió: durante la detención, durante el proceso, a los derechos humanos).', '<strong>Narrativa de los hechos</strong> e <strong>Información adicional.</strong> Recuadros de texto con formato, donde puede describir los hechos y cualquier información que ayude al análisis del caso. Se incluyen en los documentos de su solicitud.')}

<h2>Guardar la solicitud: acuse y formato de solicitud</h2>
<p>Para concluir con el registro presione el botón <strong>Enviar solicitud</strong>. El sistema muestra el avance de la carga de los archivos y, al terminar, genera sus documentos.</p>
<p>Se mostrará el aviso <strong>¡Solicitud registrada!</strong> con su <strong>Número Único de Solicitud (NUS)</strong>. Asegúrese de conservarlo. Al mismo tiempo el sistema:</p>
${li('<strong>Descarga automáticamente</strong> su <strong>acuse de recibo</strong>, con los datos generales de la petición, un código QR y una cadena de validación que confirman su autenticidad.', '<strong>Descarga automáticamente</strong> su <strong>formato de solicitud de amnistía</strong>, prellenado con la información que capturó. Si su navegador pide permiso para descargar varios archivos, acéptelo; si no se guardaron, utilice los botones <strong>Descargar acuse</strong> y <strong>Descargar formato de solicitud</strong> del aviso.', '<strong>Envía un correo</strong> a la cuenta registrada en Contacto del peticionario, con los botones <strong>Ver acuse</strong> y <strong>Ver solicitud de amnistía</strong>, y un enlace a este manual.')}
<p>El formato de solicitud de amnistía se genera según el tipo de peticionario: para una persona física, el formato <em>presentada por familiares o representante legal</em>; para una persona jurídica colectiva, el formato <em>presentada por organismos públicos defensores de Derechos Humanos</em>.</p>
<div class="nota"><p><strong>Importante:</strong> el formato incluye únicamente los datos capturados en el sistema; los campos que no se capturaron quedan en blanco. Imprímalo, complete a mano lo que falte, revíselo y fírmelo en el apartado <em>Nombre y firma</em>.</p></div>
<p>La solicitud, su acuse, su formato y sus documentos quedan disponibles para la Comisión de Amnistía y para las instituciones que intervienen en el trámite.</p>

<h2>Consulta el progreso de la solicitud</h2>
<p class="paso"><strong>Paso 1:</strong> Para consultar el progreso de la solicitud ante las instancias correspondientes debe solicitar un acceso temporal. Diríjase al portal del Poder Legislativo del Estado de México con URL: legislativoedomex.gob.mx/amnistia e identifique el banner de Ley de Amnistía del Estado de México.</p>
<p class="paso"><strong>Paso 2:</strong> En el menú superior busque el botón <strong>Consultar solicitud</strong> y dé clic para ingresar.</p>
<p class="paso"><strong>Paso 3:</strong> Escriba el <strong>correo electrónico</strong> que registró en la sección de Contacto del peticionario y presione <strong>Enviar liga de acceso</strong>. La dirección de correo electrónico solo se utilizará para efectos de verificación.</p>
<p class="paso"><strong>Paso 4:</strong> Se enviará una liga de acceso temporal a la cuenta indicada y el formulario mostrará una leyenda indicando que se envió a su correo. La liga es única, personal y confidencial, y tiene una vigencia de 60 minutos. Revise la bandeja de entrada o, en su caso, el apartado de Correo no deseado (Spam).</p>
<p class="paso"><strong>Paso 5:</strong> Abra el correo y dé clic en el botón <strong>Ver mis solicitudes</strong>.</p>
<p class="paso"><strong>Paso 6:</strong> Se mostrará el listado de solicitudes registradas con ese correo. Seleccione la solicitud para ver su progreso.</p>
<p class="paso"><strong>Paso 7:</strong> Se mostrará el seguimiento de la solicitud: el estado que guarda y las etapas del trámite, desde su recepción y la opinión de las instituciones consultadas, hasta la resolución.</p>
`;

const documento = (cuerpo) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${ESTILOS}</style></head><body>${cuerpo}</body></html>`;

const portada = () => documento(`
  <div class="portada">
    <img class="logo" src="${LOGO}" alt="Congreso del Estado de México">
    <div class="titulo">
      <h1>Ley de Amnistía<span>del Estado de México</span></h1>
      <div class="linea"></div>
      <p>Justicia y respeto a los derechos humanos para vivir en libertad</p>
      <p class="guia">GUÍA DEL USUARIO · OCTUBRE DE 2026</p>
    </div>
  </div>`);

const indice = (paginas) => `
  <div class="indice">
    <h2>Índice</h2>
    ${SECCIONES.map((t, i) => `<div class="fila"><span class="t">${t}</span><span class="p"></span><span class="n">${paginas ? paginas[i] : ''}</span></div>`).join('')}
  </div>
  <div class="salto"></div>`;

const secciones = (cuerpo) => cuerpo; // los <h2> del cuerpo son las secciones del índice

const ENCABEZADO = `<div style="width:100%;font-family:Helvetica,Arial,sans-serif;padding:0 22mm;box-sizing:border-box;margin-top:10mm">
  <div style="display:flex;align-items:center;gap:12px"><div style="flex:1;border-top:1px solid #888"></div>
  <div style="text-align:right"><div style="font-size:11px;font-weight:700;color:#7a0f45">Ley de Amnistía del Estado de México</div><div style="font-size:10px;color:#222">Guía del usuario</div></div></div></div>`;
const PIE = `<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:9px;padding-left:22mm;box-sizing:border-box"><span class="pageNumber"></span></div>`;

async function pdf(browser, html, opciones) {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setContent(html, { waitUntil: 'load' });
  const buf = Buffer.from(await page.pdf({ format: 'Letter', printBackground: true, ...opciones }));
  await page.close();
  return buf;
}

/** Página (1 = índice) de cada h2, leída del marcador (outline) que genera Chrome. */
async function paginasDeSecciones(buf) {
  const doc = await PDFDocument.load(buf);
  const paginas = doc.getPages();
  const resolver = (o) => (o instanceof PDFRef ? doc.context.lookup(o) : o);
  const resultado = {};
  const recorrer = (item) => {
    while (item) {
      const dict = resolver(item);
      if (!(dict instanceof PDFDict)) break;
      const titulo = resolver(dict.get(PDFName.of('Title')))?.decodeText?.();
      const dest = resolver(dict.get(PDFName.of('Dest')));
      if (titulo && dest instanceof PDFArray) {
        const ref = dest.get(0);
        const indice = paginas.findIndex((p) => p.ref === ref);
        if (indice >= 0) resultado[titulo.trim()] = indice + 1;
      }
      const hijo = dict.get(PDFName.of('First'));
      if (hijo) recorrer(hijo);
      item = dict.get(PDFName.of('Next'));
    }
  };
  const raiz = resolver(doc.catalog.get(PDFName.of('Outlines')));
  if (raiz instanceof PDFDict) recorrer(raiz.get(PDFName.of('First')));
  return resultado;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: rutaChromium(), args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const cuerpo = (paginas) => documento(indice(paginas) + secciones(CUERPO));
    const opcionesCuerpo = {
      displayHeaderFooter: true, headerTemplate: ENCABEZADO, footerTemplate: PIE, outline: true, tagged: true,
      margin: { top: '26mm', bottom: '20mm', left: '22mm', right: '22mm' },
    };

    const primera = await pdf(browser, cuerpo(null), opcionesCuerpo);
    const encontradas = await paginasDeSecciones(primera);
    const paginas = SECCIONES.map((t) => encontradas[t]);
    if (paginas.some((p) => !p)) throw new Error(`No se encontró la página de: ${SECCIONES.filter((t, i) => !paginas[i]).join(', ')}`);

    const cuerpoFinal = await pdf(browser, cuerpo(paginas), opcionesCuerpo);
    const portadaPdf = await pdf(browser, portada(), { pageRanges: '1', margin: { top: '20mm', bottom: '10mm', left: '0', right: '0' } });

    const final = await PDFDocument.create();
    for (const origen of [portadaPdf, cuerpoFinal]) {
      const d = await PDFDocument.load(origen);
      (await final.copyPages(d, d.getPageIndices())).forEach((p) => final.addPage(p));
    }
    final.setTitle('Ley de Amnistía del Estado de México - Guía del usuario');
    fs.writeFileSync(SALIDA, await final.save());
    console.log('Manual generado:', SALIDA, '| páginas:', final.getPageCount(), '| índice:', paginas.join(', '));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
