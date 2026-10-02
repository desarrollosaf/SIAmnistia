/** Contenido informativo del landing (tomado del landing del sistema anterior). */

export const SUPUESTOS_ART_4: { titulo: string; casos: string[] }[] = [
  {
    titulo: 'Por el delito de aborto, en cualquiera de sus modalidades, previsto en el Código Penal, cuando:',
    casos: [
      'Se impute a la madre del producto del embarazo interrumpido.',
      'Se impute a las y los médicos, cirujanos, comadronas o parteras, u otro personal autorizado de servicios de la salud, que hayan auxiliado en la interrupción del embarazo, siempre que la conducta delictiva se haya llevado a cabo sin violencia y con el consentimiento de la madre.',
      'Se impute a los parientes consanguíneos de la madre del producto que hayan auxiliado en la interrupción del embarazo, y exista consentimiento de la madre.',
    ],
  },
  {
    titulo: 'Por los delitos contra la salud de los cuales conozcan los tribunales del Estado de México, cuando:',
    casos: [
      'Quien lo haya cometido se encuentre en situación de pobreza, o de extrema vulnerabilidad por su condición de exclusión y discriminación.',
      'El delito se haya cometido por indicación de su cónyuge, concubinario o concubina, pareja sentimental, pariente consanguíneo o por afinidad sin limitación de grado.',
      'Por temor fundado, así como quien haya sido obligado por grupos de la delincuencia organizada a cometer el delito.',
      'Quien lo haya cometido pertenezca a un pueblo o comunidad indígena o afromexicana.',
    ],
  },
  {
    titulo: 'Por delitos imputados a personas campesinas o pertenecientes a los pueblos originarios, comunidades indígenas o afromexicanas, que se encuentren dentro de alguno de los siguientes supuestos:',
    casos: [
      'Por defender legítimamente su tierra, recursos naturales, bosques o sus usos y costumbre.',
      'Durante su proceso no hayan accedido plenamente a la jurisdicción del Estado por no contar con intérpretes o defensores que tuvieran conocimiento de su lengua o cultura.',
      'Cuando se compruebe que se encuentran en situación de pobreza extrema, notoria inexperiencia y extrema vulnerabilidad.',
    ],
  },
  {
    titulo: 'Por el delito de robo en sus siguientes modalidades:',
    casos: [
      'Robo simple y sin violencia, cuando el monto de lo robado no exceda de las cuatrocientas veces el valor diario de la UMA vigente, previa reparación del daño.',
      'Robo con violencia, siempre y cuando concurran circunstancias especiales: delincuente primario, sin lesiones ni armas de fuego, monto no mayor a 90 UMA, con reparación del daño, sin otros procesos pendientes, y el sujeto activo no sea servidor público.',
    ],
  },
];

export const PROCEDIMIENTO: { titulo: string; texto: string }[] = [
  {
    titulo: 'Presentación de la solicitud',
    texto: 'Se puede presentar una solicitud de amnistía ante el Poder Judicial del Estado de México, ante la Comisión de Derechos Humanos del Estado de México, o ante la Comisión Especial en materia de Amnistía de la Legislatura del Estado de México.',
  },
  {
    titulo: 'Formas de presentación',
    texto: 'Puedes presentar tu caso de forma física o por escrito en la oficina de la Presidencia de la Comisión, ubicada en Plaza Hidalgo S/N, Colonia Centro, Toluca, México, C.P. 50000. O bien, de forma electrónica a través de este sitio web.',
  },
  {
    titulo: 'Estudio y análisis',
    texto: 'Para el estudio y análisis de la solicitud, la Comisión Especial está facultada para solicitar la opinión consultiva de la Comisión de Derechos Humanos, la Fiscalía General de Justicia, el Poder Judicial y el Poder Ejecutivo del Estado de México.',
  },
  {
    titulo: 'Tiempos de tramitación',
    texto: 'La tramitación requiere del desarrollo de un procedimiento que, por la naturaleza de cada petición, podrá ser superior a los 60 días hábiles, contados a partir del día siguiente en que sea notificada la recepción de la solicitud.',
  },
  {
    titulo: 'Resolución judicial',
    texto: 'Una vez admitida la solicitud y cumplidos los requisitos legales, el juez competente deberá determinar la procedencia o improcedencia de la amnistía dentro de los 30 días hábiles siguientes, pudiendo extender dicho plazo hasta por 30 días más.',
  },
  {
    titulo: 'Notificaciones electrónicas',
    texto: 'Los acuerdos y comunicados serán notificados mediante la plataforma digital. Deberás proporcionar un correo electrónico al que se enviará el número de control y la clave de acceso para consultar la información de tu solicitud.',
  },
  {
    titulo: 'Solicitudes físicas: seguimiento digital',
    texto: 'Cuando se recibe una solicitud de forma física, la Comisión Especial digitaliza la información, le asigna un número único y genera una clave de acceso. Esto permite consultar el avance desde cualquier lugar, sin necesidad de traslados. Para personas privadas de su libertad, las notificaciones se harán a la persona autorizada.',
  },
];

export const PREGUNTAS: { pregunta: string; texto?: string; lista?: string[]; nota?: string }[] = [
  {
    pregunta: '¿Qué es la amnistía?',
    texto: 'Es un instrumento jurídico mediante el cual una persona acusada o sentenciada por algún delito puede recuperar su libertad.',
  },
  {
    pregunta: '¿La amnistía implica liberar a todas las personas privadas de su libertad?',
    texto: 'No. La Ley de Amnistía del Estado de México contempla que el beneficio se otorgue a personas:',
    lista: [
      'Sin antecedentes de reincidencia u otros delitos.',
      'Cuyos delitos sean considerados de bajo impacto.',
      'Acusadas por delitos que no cometieron.',
      'Que no accedieron a una adecuada defensa por su situación de vulnerabilidad.',
      'Que padecieron violaciones a sus derechos humanos o al debido proceso.',
    ],
  },
  {
    pregunta: '¿En qué casos se puede solicitar el beneficio de la amnistía?',
    texto: 'Algunos de los casos por los que puede otorgarse son:',
    lista: [
      'Por el delito de aborto.',
      'Por delitos contra la salud que implican participación en actividades relacionadas con el narcotráfico, ya sea bajo amenaza o a causa de su situación de vulnerabilidad o pobreza.',
      'Cuando se trata de personas pertenecientes a pueblos originarios que enfrentan cargos por defender su tierra, o que no contaron con intérpretes de su lengua durante el proceso.',
      'Cuando se acuse o haya sentenciado a una mujer por haber ejercido excesos en la legítima defensa de su propia integridad o la de su familia.',
      'Cuando se trate del delito de robo simple.',
    ],
    nota: 'Si deseas conocer a detalle los supuestos que contempla la Ley, consulta la sección "Conoce la Ley".',
  },
  {
    pregunta: '¿Ante qué autoridad puedo presentar la solicitud de amnistía?',
    lista: [
      'Ante el Poder Judicial del Estado de México.',
      'Ante la Comisión de Derechos Humanos del Estado de México.',
      'Ante la Comisión Especial en materia de Amnistía de la Legislatura del Estado de México, cuando haya existido violación de los derechos humanos o fallas en la aplicación de los principios penales del sistema acusatorio, o cuando exista plena presunción sobre la fabricación del delito.',
    ],
  },
  {
    pregunta: '¿Entonces el Poder Legislativo puede otorgar la amnistía al presentar una solicitud?',
    texto: 'La Legislatura Mexiquense da seguimiento a lo que ordena la ley y tiene facultad de solicitar la opinión consultiva sobre las solicitudes que reciba ante las siguientes instancias:',
    lista: [
      'Comisión de Derechos Humanos del Estado de México.',
      'Fiscalía General de Justicia del Estado de México.',
      'Poder Judicial del Estado de México.',
      'Secretaría de Justicia y Derechos Humanos.',
      'Organizaciones de la Sociedad Civil dedicadas a la protección y defensa de los derechos humanos.',
    ],
    nota: 'La resolución no depende completamente del Poder Legislativo ni de su Comisión Especial. La recepción de la solicitud de ninguna forma garantiza el otorgamiento de la amnistía.',
  },
  {
    pregunta: '¿Cómo puedo presentar mi solicitud de amnistía?',
    texto: 'Puede ser de las siguientes formas:',
    lista: [
      'Físicamente, por escrito, en la oficina de la Presidencia de la Comisión Especial en Materia de Amnistía, ubicada en el recinto legislativo del Estado de México, en Plaza Hidalgo S/N, Colonia Centro, Toluca, México, C.P. 50000.',
      'De forma electrónica, desde cualquier parte del Estado de México, a través de este sitio web.',
    ],
  },
  {
    pregunta: '¿Si presento mi solicitud de forma física, cómo puedo darle seguimiento?',
    texto: 'Te informaremos por vía electrónica. Cuando se recibe una solicitud por escrito, la Comisión Especial digitaliza la información, le asigna un número único dentro del sistema y genera una clave para el acceso; por ello es necesario señalar un correo electrónico y un teléfono de la persona autorizada, quien podrá consultar el avance desde cualquier lugar del Estado de México, sin necesidad de trasladarse.',
    nota: 'Tratándose de personas privadas de su libertad, las notificaciones se harán a la persona autorizada.',
  },
  {
    pregunta: '¿Qué datos debo preparar para realizar la solicitud de amnistía?',
    texto: 'La solicitud deberá estar dirigida a la Comisión Especial en materia de Amnistía de la Legislatura del Estado de México e incluir:',
    lista: [
      'Nombre completo, fecha de nacimiento, firma de la persona que presenta la solicitud y copia de identificación.',
      'Domicilio, teléfono, correo electrónico y datos de contacto del representante legal o persona autorizada para recibir documentación y notificaciones.',
      'CURP de la persona que puede ser beneficiada.',
      'Número del expediente judicial, carpeta de investigación o averiguación previa, así como el juzgado ante el cual está radicada la causa penal.',
      'Centro Penitenciario de Reinserción Social donde se encuentra internada la persona privada de su libertad.',
      'Escrito con la narración de lo ocurrido, señalando específicamente los supuestos de violación de derechos, fallas en el proceso acusatorio o presunción de fabricación de delitos.',
      'Si cuenta con alguna recomendación de organismo de derechos humanos, señalar la fecha.',
    ],
  },
];

export const URL_LEY = 'http://www.legislativoedomex.gob.mx/documentos/leyes/pdf/258.pdf';
