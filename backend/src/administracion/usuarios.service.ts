import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize, Transaction } from 'sequelize';
import * as bcrypt from 'bcryptjs';
import { Usuario, nombreCompleto } from '../database/models/usuario.model';
import { Institucion } from '../database/models/institucion.model';
import { Rol } from '../database/models/rol.model';
import { ModelHasRole } from '../database/models/model-has-role.model';
import { SolicitudUser } from '../database/models/solicitud-user.model';
import { MORPH } from '../database/models/opciones-tabla';
import { UsuarioDto } from './dto/administracion.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(Usuario) private readonly usuarioModel: typeof Usuario,
    @InjectModel(ModelHasRole) private readonly modelHasRoleModel: typeof ModelHasRole,
    @InjectModel(SolicitudUser) private readonly turnoModel: typeof SolicitudUser,
    @InjectModel(Institucion) private readonly institucionModel: typeof Institucion,
  ) {}

  async listar() {
    const usuarios = await this.usuarioModel.findAll({ include: [Institucion, Rol], order: [['nombre', 'ASC']] });
    return usuarios.map((u) => this.aRespuesta(u));
  }

  async obtener(id: number) {
    const u = await this.usuarioModel.findByPk(id, { include: [Institucion, Rol] });
    if (!u) throw new NotFoundException('No existe el usuario');
    return this.aRespuesta(u);
  }

  async crear(dto: UsuarioDto) {
    if (!dto.password) throw new BadRequestException('Captura la contraseña del usuario');
    await this.validar(dto);
    const id = await this.sequelize.transaction(async (transaction) => {
      const u = await this.usuarioModel.create(
        { ...this.columnas(dto), password: await bcrypt.hash(dto.password!, 10), email_verified_at: new Date() },
        { transaction },
      );
      await this.asignarRoles(u.id, dto.rolIds ?? [], transaction);
      return u.id;
    });
    return this.obtener(id);
  }

  async actualizar(id: number, dto: UsuarioDto) {
    const u = await this.usuarioModel.findByPk(id);
    if (!u) throw new NotFoundException('No existe el usuario');
    await this.validar(dto, id);
    await this.sequelize.transaction(async (transaction) => {
      await u.update(
        { ...this.columnas(dto), ...(dto.password ? { password: await bcrypt.hash(dto.password, 10) } : {}) },
        { transaction },
      );
      if (dto.rolIds) await this.asignarRoles(id, dto.rolIds, transaction);
    });
    return this.obtener(id);
  }

  async eliminar(id: number, actualId: number) {
    if (id === actualId) throw new BadRequestException('No puedes eliminar tu propio usuario');
    const u = await this.usuarioModel.findByPk(id);
    if (!u) throw new NotFoundException('No existe el usuario');
    if (await this.turnoModel.count({ where: { user_id: id } })) {
      throw new ConflictException('El usuario tiene solicitudes turnadas; no se puede eliminar');
    }
    await this.sequelize.transaction(async (transaction) => {
      await this.modelHasRoleModel.destroy({ where: { model_id: id, model_type: MORPH.usuario }, transaction });
      await u.destroy({ transaction });
    });
    return { ok: true };
  }

  private async validar(dto: UsuarioDto, id?: number) {
    const repetido = await this.usuarioModel.count({
      where: { email: dto.email, ...(id ? { id: { [Op.ne]: id } } : {}) },
    });
    if (repetido) throw new ConflictException('Ya existe un usuario con ese correo');
    if (!(await this.institucionModel.count({ where: { id: dto.institucionId } }))) {
      throw new BadRequestException('Selecciona una institución válida');
    }
  }

  private async asignarRoles(usuarioId: number, rolIds: number[], transaction: Transaction) {
    await this.modelHasRoleModel.destroy({ where: { model_id: usuarioId, model_type: MORPH.usuario }, transaction });
    if (rolIds.length) {
      await this.modelHasRoleModel.bulkCreate(
        rolIds.map((role_id) => ({ role_id, model_type: MORPH.usuario, model_id: usuarioId })),
        { transaction },
      );
    }
  }

  private columnas(dto: UsuarioDto) {
    return {
      nombre: dto.nombre,
      primer_apellido: dto.primerApellido,
      segundo_apellido: dto.segundoApellido || null,
      email: dto.email,
      telefono: dto.telefono,
      celular: dto.celular,
      institucion_id: dto.institucionId,
    };
  }

  private aRespuesta(u: Usuario) {
    return {
      id: u.id,
      nombre: u.nombre,
      primerApellido: u.primer_apellido,
      segundoApellido: u.segundo_apellido,
      nombreCompleto: nombreCompleto(u),
      email: u.email,
      telefono: u.telefono,
      celular: u.celular,
      institucionId: u.institucion_id,
      institucion: u.institucion?.nombre_institucion ?? '',
      roles: (u.roles ?? []).map((r) => ({ id: r.id, nombre: r.name })),
    };
  }
}
