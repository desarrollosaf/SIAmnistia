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
    const esPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    callback(esPdf ? null : new BadRequestException(`"${file.originalname}" no es un archivo PDF`), esPdf);
  },
};
