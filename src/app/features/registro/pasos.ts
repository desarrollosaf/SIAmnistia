export interface PasoRegistro {
  titulo: string;
  corto: string;
  icono: string;
  ayuda: string[];
}

/** Pasos del formulario público y su texto de ayuda (tomado de la guía del sistema anterior). */
export const PASOS: PasoRegistro[] = [
  {
    titulo: 'Datos generales del peticionario',
    corto: 'Peticionario',
    icono: 'persona',
    ayuda: [
      'Selecciona si quien solicita es una persona física o una persona jurídica colectiva (institución u organismo que representa al beneficiario).',
      'Persona física: escribe tu nombre y apellidos completos, sin abreviaturas ni signos especiales. Si tienes un solo apellido, escríbelo en "Primer apellido".',
      'Si tienes parentesco o relación con el beneficiario, márcalo, selecciónalo de la lista (o elige "Otro" y especifícalo) y adjunta el acta de nacimiento que lo acredite.',
      'Persona jurídica colectiva: escribe el nombre completo de la institución u organismo y su RFC.',
      'Adjunta tu identificación oficial (INE por ambos lados) o, para instituciones, el acta constitutiva o poder notarial. Formato PDF.',
    ],
  },
  {
    titulo: 'Domicilio del peticionario',
    corto: 'Domicilio',
    icono: 'casa',
    ayuda: [
      'Captura el domicilio actual de la persona, institución u organismo que solicita: calle, número exterior, número interior (si aplica), colonia, entidad federativa y municipio o alcaldía.',
    ],
  },
  {
    titulo: 'Contacto del peticionario',
    corto: 'Contacto',
    icono: 'telefono',
    ayuda: [
      'A este correo se enviará el acuse de tu solicitud y las notificaciones. Con él también podrás consultar el estatus de tu solicitud.',
      'Escribe los números de teléfono a 10 dígitos, sin espacios ni guiones.',
    ],
  },
  {
    titulo: 'Datos del beneficiario',
    corto: 'Beneficiario',
    icono: 'personas',
    ayuda: [
      'El beneficiario es la persona privada de la libertad para quien se solicita la amnistía.',
      'Escribe su nombre y apellidos completos, su fecha de nacimiento, su género y su CURP de 18 caracteres.',
      'Adjunta la constancia de CURP del beneficiario en formato PDF.',
    ],
  },
  {
    titulo: 'Carpetas de investigación',
    corto: 'Carpetas',
    icono: 'carpeta',
    ayuda: [
      'Agrega cada carpeta de investigación o causa penal con la razón por la que solicitas el análisis.',
      'Si conoces la ubicación de la violación en el expediente, indica el tomo y la foja.',
      'Cada carpeta debe tener al menos un delito. Si el delito no está en la lista, elige "OTRO" y escríbelo.',
    ],
  },
  {
    titulo: 'Detalles de la solicitud',
    corto: 'Solicitud',
    icono: 'balanza',
    ayuda: [
      'CPRS: Centro Preventivo y de Readaptación Social donde se encuentra el beneficiario.',
      'Situación jurídica: "Procesado" si el proceso penal no ha concluido; "Sentenciado" si ya existe sentencia (adjunta la sentencia definitiva en PDF); "Otro" para especificar otra situación.',
      'Tipo de defensor: público si lo designó el juez; privado si fue contratado.',
    ],
  },
  {
    titulo: 'Narrativa de los hechos',
    corto: 'Narrativa',
    icono: 'nota',
    ayuda: [
      'Puedes adjuntar un PDF (hasta 125 MB, escala de grises a 150 dpi) con la verdad jurídica de los hechos y la justificación de la presunta violación.',
      'En los recuadros describe los hechos y cualquier información adicional que ayude al análisis de tu caso.',
    ],
  },
];
