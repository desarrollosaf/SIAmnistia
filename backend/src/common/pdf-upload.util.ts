import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { MAX_PDF_BYTES } from './amnistia.constants';

/** Opciones de multer para campos que solo aceptan PDF (documentos de la solicitud). */
export const SOLO_PDF = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const nombre = file.originalname.toLowerCase();
    const esPdf = file.mimetype === 'application/pdf' || nombre.endsWith('.pdf');
    // La verdad de los hechos también admite ZIP (varios PDF ya comprimidos).
    const esZip = file.fieldname === 'verdad_hechos' && nombre.endsWith('.zip');
    const valido = esPdf || esZip;
    callback(valido ? null : new BadRequestException(`"${file.originalname}" no es un archivo PDF`), valido);
  },
};
