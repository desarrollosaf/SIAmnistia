import { Global, Module } from '@nestjs/common';
import { ArchivosService } from './archivos.service';
import { CatalogoNombresService } from './catalogo-nombres.service';
import { ContadorService } from './contador.service';
import { CorreoService } from './correo.service';
import { PdfService } from './pdf.service';
import { DocumentosGeneradosService } from './documentos-generados.service';

// Servicios transversales (archivos, PDFs, correo, folios) que usan el registro público y el
// seguimiento interno de solicitudes.
@Global()
@Module({
  providers: [
    ArchivosService,
    CatalogoNombresService,
    ContadorService,
    CorreoService,
    PdfService,
    DocumentosGeneradosService,
  ],
  exports: [
    ArchivosService,
    CatalogoNombresService,
    ContadorService,
    CorreoService,
    PdfService,
    DocumentosGeneradosService,
  ],
})
export class ComunModule {}
