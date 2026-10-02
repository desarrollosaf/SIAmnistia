import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Usuario, nombreCompleto } from '../database/models/usuario.model';
import { Institucion } from '../database/models/institucion.model';
import { Rol } from '../database/models/rol.model';
import { INSTITUCION } from '../common/amnistia.constants';
import type { UsuarioActual } from './usuario-actual';

/** Laravel guarda bcrypt con prefijo $2y$; es el mismo algoritmo que $2b$. */
export function compararPassword(plano: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plano, hash.replace(/^\$2y\$/, '$2b$'));
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario)
    private readonly usuarioModel: typeof Usuario,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usuarioModel.scope('conPassword').findOne({
      where: { email: email.trim().toLowerCase() },
      include: [Institucion, Rol],
    });

    if (!user || !(await compararPassword(password, user.password))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const payload: UsuarioActual = {
      sub: user.id,
      email: user.email,
      institucionId: user.institucion_id,
      institucion: user.institucion?.nombre_institucion ?? '',
      legislativo: user.institucion?.nombre_institucion === INSTITUCION.legislativo,
      judicial: user.institucion?.nombre_institucion === INSTITUCION.judicial,
      roles: (user.roles ?? []).map((r) => r.name),
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.jwtSecret'),
      expiresIn: this.configService.get<number>('auth.jwtExpiresInSeconds'),
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: nombreCompleto(user),
        institucionId: payload.institucionId,
        institucion: payload.institucion,
        legislativo: payload.legislativo,
        judicial: payload.judicial,
        roles: payload.roles,
      },
    };
  }
}
