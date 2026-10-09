import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

interface ConfigCorreo {
  host?: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  from: string;
}

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Envío de correos por SMTP. Sin MAIL_HOST configurado solo registra el envío en el log. */
@Injectable()
export class CorreoService {
  private readonly logger = new Logger('Correo');
  private readonly transporter: Transporter | null;
  private readonly from: string;
  readonly appUrl: string;

  constructor(config: ConfigService) {
    const mail = config.get<ConfigCorreo>('app.mail')!;
    this.appUrl = config.get<string>('app.url')!;
    this.from = mail.from;
    this.transporter = mail.host
      ? createTransport({
          host: mail.host,
          port: mail.port,
          secure: mail.secure,
          auth: mail.username ? { user: mail.username, pass: mail.password } : undefined,
        })
      : null;
  }

  async enviar(para: string, asunto: string, cuerpoHtml: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`MAIL_HOST no configurado; no se envió "${asunto}" a ${para}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to: para, subject: asunto, html: plantilla(cuerpoHtml) });
  }

  /** Igual que enviar(), pero un fallo de correo no debe tumbar la operación que lo origina. */
  async enviarSinFallar(para: string, asunto: string, cuerpoHtml: string): Promise<void> {
    try {
      await this.enviar(para, asunto, cuerpoHtml);
    } catch (error) {
      this.logger.warn(`No se pudo enviar "${asunto}" a ${para}: ${(error as Error).message}`);
    }
  }

  acuseRecibido(nombre: string, uuidAcuse: string, uuidFormato: string | null = null): string {
    const liga = `${this.appUrl}/acuse/${uuidAcuse}`;
    const ligaFormato = uuidFormato ? `${this.appUrl}/formato/${uuidFormato}` : null;
    return `
      <p>Estimado(a) <strong>${escapar(nombre)}</strong>:</p>
      <p>Recibimos tu solicitud para el proceso de amnistía. Con ${ligaFormato ? 'los siguientes botones puedes ver tu acuse de recibo y la solicitud de amnistía que se generó con tus datos' : 'el siguiente botón puedes ver tu acuse de recibo'}.</p>
      ${boton(liga, 'Ver acuse')}
      ${ligaFormato ? boton(ligaFormato, 'Ver solicitud de amnistía') : ''}
      ${boton(`${this.appUrl}/assets/manual-amnistia.pdf`, 'Manual de usuario', true)}
      <p class="nota">Si no puedes ver el botón, copia y pega esta liga en tu navegador:<br>${liga}${ligaFormato ? `<br>${ligaFormato}` : ''}</p>`;
  }

  turnoInstitucion(institucionId: number, solicitante: string, nus: string): string {
    const textos: Record<number, string> = {
      2: 'respecto de posibles violaciones u omisiones de Derechos Humanos que pudieran haberse suscitado a partir de la detención o durante todo el proceso o bien, posibles casos de tortura',
      3: 'respecto de posibles violaciones u omisiones a partir del informe policial homologado, posible ilegal detención y/o actuaciones u omisiones realizadas por el Ministerio Público responsable o bien, por la Policía de Investigación relacionado con el mismo',
      4: 'respecto de posibles violaciones u omisiones al debido proceso que pudieran haberse suscitado a partir de la detención o durante las diversas etapas del proceso',
    };
    const materia = textos[institucionId] ? `, a efecto de que se sirva emitir opinión consultiva ${textos[institucionId]}` : ', a efecto de que se sirva emitir opinión consultiva respecto de la misma';
    return `
      <p><strong>Ley de Amnistía del Estado de México.</strong> Justicia y respeto a los derechos humanos para vivir en libertad.</p>
      <p>Tiene una solicitud por atender.</p>
      <p>Solicitante: <strong>${escapar(solicitante)}</strong><br>Número Único de Solicitud: <strong>${escapar(nus)}</strong></p>
      <p style="text-align:justify">Con fundamento en la Ley de Amnistía del Estado de México y en los Lineamientos para el procedimiento de atención a los casos que por su relevancia son puestos a consideración de la Comisión Especial en Materia de Amnistía, por medio del presente correo se pone a su apreciable consideración la solicitud de Amnistía${materia}.</p>
      <p style="text-align:justify">Una vez recibido el presente correo se cuenta con un plazo de 72 horas para acusar su recepción; transcurrido el mismo, se tendrá por recibido, generando dentro de la ruta del proceso de la solicitud el aviso al peticionario de que ha sido turnada para la emisión de opinión consultiva ante esa autoridad.</p>
      <p><strong>ATENTAMENTE</strong><br>COMISIÓN ESPECIAL EN MATERIA DE AMNISTÍA</p>
      ${boton(`${this.appUrl}/login`, 'Acceso al sistema')}`;
  }

  tokenConsulta(nombre: string, email: string, token: string, minutos: number): string {
    return `
      <p>Apreciable: <strong>${escapar(nombre)}</strong></p>
      <p style="text-align:justify">El acceso que se envía es único, personal, confidencial e intransferible y deberá utilizarse única y exclusivamente para consultar sus solicitudes. La liga tiene una vigencia de ${minutos} minutos. Su uso será bajo exclusiva responsabilidad del titular, por lo que por ningún motivo deberá hacerla del conocimiento de otra(s) persona(s).</p>
      ${boton(`${this.appUrl}/consulta/${token}`, 'Ver mis solicitudes')}
      <p class="nota">Has recibido esta notificación porque estás registrado con la cuenta de correo ${escapar(email)}. Si la recibiste por error, notifícalo al remitente y elimínala de tu bandeja.</p>`;
  }
}

function boton(url: string, texto: string, secundario = false): string {
  const fondo = secundario ? '#ffffff' : '#960048';
  const color = secundario ? '#960048' : '#ffffff';
  return `<p style="text-align:center;margin:22px 0"><a href="${url}" style="display:inline-block;padding:12px 26px;border-radius:10px;border:1.5px solid #960048;background:${fondo};color:${color};font-weight:700;text-decoration:none">${texto}</a></p>`;
}

function plantilla(cuerpo: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;color:#4b4b4d;font-size:14px;line-height:1.55">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e2e3">
      <div style="background:linear-gradient(135deg,#960048,#5a002b);color:#fff;padding:18px 24px;font-weight:700">Poder Legislativo del Estado de México · Sistema de Amnistía</div>
      <div style="padding:24px">${cuerpo}</div>
    </div>
    <style>.nota{font-size:12px;color:#767679}</style>
  </body></html>`;
}
