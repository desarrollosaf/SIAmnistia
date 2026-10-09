import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Institucion } from '../database/models/institucion.model';
import { Usuario } from '../database/models/usuario.model';
import { Rol } from '../database/models/rol.model';
import { ModelHasRole } from '../database/models/model-has-role.model';
import { Delito } from '../database/models/delito.model';
import { ModalidadDelito } from '../database/models/modalidad-delito.model';
import { Genero } from '../database/models/genero.model';
import { Persona } from '../database/models/persona.model';
import { SituacionJuridica } from '../database/models/situacion-juridica.model';
import { Solicitud } from '../database/models/solicitud.model';
import { Contador } from '../database/models/contador.model';
import { TipoContador } from '../database/models/tipo-contador.model';
import { ROL } from '../common/amnistia.constants';
import { DelitoDto, InstitucionDto, ModalidadDto } from './dto/administracion.dto';

/** Catálogos que administra el Super usuario: instituciones, roles, delitos, modalidades, géneros y folios. */
@Injectable()
export class CatalogosAdminService {
  constructor(
    @InjectModel(Institucion) private readonly institucionModel: typeof Institucion,
    @InjectModel(Usuario) private readonly usuarioModel: typeof Usuario,
    @InjectModel(Rol) private readonly rolModel: typeof Rol,
    @InjectModel(ModelHasRole) private readonly modelHasRoleModel: typeof ModelHasRole,
    @InjectModel(Delito) private readonly delitoModel: typeof Delito,
    @InjectModel(ModalidadDelito) private readonly modalidadModel: typeof ModalidadDelito,
    @InjectModel(Genero) private readonly generoModel: typeof Genero,
    @InjectModel(Persona) private readonly personaModel: typeof Persona,
    @InjectModel(SituacionJuridica) private readonly situacionModel: typeof SituacionJuridica,
    @InjectModel(Solicitud) private readonly solicitudModel: typeof Solicitud,
    @InjectModel(Contador) private readonly contadorModel: typeof Contador,
  ) {}

  // --- Instituciones -------------------------------------------------------------------

  async instituciones() {
    const filas = await this.institucionModel.findAll({ include: [{ model: Usuario, attributes: ['id'] }], order: [['id', 'ASC']] });
    return filas.map((i) => ({
      id: i.id,
      nombre: i.nombre_institucion,
      email: i.email_institucion,
      usuarios: i.usuarios?.length ?? 0,
    }));
  }

  async guardarInstitucion(dto: InstitucionDto, id?: number) {
    const datos = { nombre_institucion: dto.nombre, email_institucion: dto.email };
    if (!id) return this.institucionModel.create(datos);
    const fila = await this.existe(this.institucionModel.findByPk(id), 'la institución');
    return fila.update(datos);
  }

  async eliminarInstitucion(id: number) {
    const fila = await this.existe(this.institucionModel.findByPk(id), 'la institución');
    if (await this.usuarioModel.count({ where: { institucion_id: id } })) {
      throw new ConflictException('La institución tiene usuarios; reasígnalos antes de eliminarla');
    }
    await fila.destroy();
    return { ok: true };
  }

  // --- Roles ---------------------------------------------------------------------------

  async roles() {
    const filas = await this.rolModel.findAll({ order: [['id', 'ASC']] });
    const asignaciones = await this.modelHasRoleModel.findAll({ attributes: ['role_id'] });
    return filas.map((r) => ({
      id: r.id,
      nombre: r.name,
      usuarios: asignaciones.filter((a) => a.role_id === r.id).length,
      protegido: r.name === ROL.superUsuario,
    }));
  }

  async guardarRol(nombre: string, id?: number) {
    if (!id) return this.rolModel.create({ name: nombre, guard_name: 'web' });
    const fila = await this.existe(this.rolModel.findByPk(id), 'el rol');
    if (fila.name === ROL.superUsuario) throw new ConflictException('El rol Super usuario no se puede renombrar');
    return fila.update({ name: nombre });
  }

  async eliminarRol(id: number) {
    const fila = await this.existe(this.rolModel.findByPk(id), 'el rol');
    if (fila.name === ROL.superUsuario) throw new ConflictException('El rol Super usuario no se puede eliminar');
    await this.modelHasRoleModel.destroy({ where: { role_id: id } });
    await fila.destroy();
    return { ok: true };
  }

  // --- Delitos y modalidades -----------------------------------------------------------

  async delitos() {
    const filas = await this.delitoModel.findAll({ include: [ModalidadDelito], order: [['id', 'ASC']] });
    return filas.map((d) => ({ id: d.id, delito: d.delito, modalidades: d.modalidades?.length ?? 0 }));
  }

  async guardarDelito(dto: DelitoDto, id?: number) {
    if (!id) return this.delitoModel.create({ delito: dto.delito, obligatorio: false });
    const fila = await this.existe(this.delitoModel.findByPk(id), 'el delito');
    if (esDelitoProtegido(fila.delito)) throw new ConflictException('El delito OTRO no se puede renombrar: el formulario público depende de él');
    return fila.update({ delito: dto.delito });
  }

  async eliminarDelito(id: number) {
    const fila = await this.existe(this.delitoModel.findByPk(id), 'el delito');
    if (esDelitoProtegido(fila.delito)) throw new ConflictException('El delito OTRO no se puede eliminar: el formulario público depende de él');
    await this.modalidadModel.destroy({ where: { delito_id: id } });
    await fila.destroy();
    return { ok: true };
  }

  async modalidades() {
    const filas = await this.modalidadModel.findAll({ include: [Delito], order: [['delito_id', 'ASC'], ['id', 'ASC']] });
    return filas.map((m) => ({ id: m.id, delitoId: m.delito_id, delito: m.delito?.delito ?? '', nombre: m.nombre }));
  }

  async guardarModalidad(dto: ModalidadDto, id?: number) {
    await this.existe(this.delitoModel.findByPk(dto.delitoId), 'el delito');
    const datos = { delito_id: dto.delitoId, nombre: dto.nombre };
    if (!id) return this.modalidadModel.create(datos);
    const fila = await this.existe(this.modalidadModel.findByPk(id), 'la modalidad');
    return fila.update(datos);
  }

  async eliminarModalidad(id: number) {
    const fila = await this.existe(this.modalidadModel.findByPk(id), 'la modalidad');
    await fila.destroy();
    return { ok: true };
  }

  // --- Géneros -------------------------------------------------------------------------

  async generos() {
    const filas = await this.generoModel.findAll({ order: [['id', 'ASC']] });
    return filas.map((g) => ({ id: g.id, nombre: g.nombre }));
  }

  async guardarGenero(nombre: string, id?: number) {
    const datos = { nombre: nombre.toUpperCase() };
    if (!id) return this.generoModel.create(datos);
    const fila = await this.existe(this.generoModel.findByPk(id), 'el género');
    return fila.update(datos);
  }

  async eliminarGenero(id: number) {
    const fila = await this.existe(this.generoModel.findByPk(id), 'el género');
    if (await this.personaModel.count({ where: { genero_id: id }, paranoid: false })) {
      throw new ConflictException('El género ya se usa en solicitudes registradas; no se puede eliminar');
    }
    await fila.destroy();
    return { ok: true };
  }

  // --- Situaciones jurídicas -----------------------------------------------------------

  async situacionesJuridicas() {
    const filas = await this.situacionModel.findAll({ order: [['id', 'ASC']] });
    const total = (id: number) => this.solicitudModel.count({ where: { situacion_juridica_id: id }, paranoid: false });
    return Promise.all(filas.map(async (f) => ({ id: f.id, nombre: f.nombre, solicitudes: await total(f.id) })));
  }

  async guardarSituacionJuridica(nombre: string, id?: number) {
    if (!id) return this.situacionModel.create({ nombre });
    const fila = await this.existe(this.situacionModel.findByPk(id), 'la situación jurídica');
    if (esSituacionProtegida(fila.nombre)) {
      throw new ConflictException('La situación "Otro" no se puede renombrar: el formulario público depende de ella');
    }
    return fila.update({ nombre });
  }

  async eliminarSituacionJuridica(id: number) {
    const fila = await this.existe(this.situacionModel.findByPk(id), 'la situación jurídica');
    if (esSituacionProtegida(fila.nombre)) {
      throw new ConflictException('La situación "Otro" no se puede eliminar: el formulario público depende de ella');
    }
    if (await this.solicitudModel.count({ where: { situacion_juridica_id: id }, paranoid: false })) {
      throw new ConflictException('La situación jurídica ya se usa en solicitudes registradas; no se puede eliminar');
    }
    await fila.destroy();
    return { ok: true };
  }

  // --- Contadores (folios) ---------------------------------------------------------------

  async contadores() {
    const filas = await this.contadorModel.findAll({ include: [TipoContador], order: [['anio', 'DESC']] });
    return filas.map((c) => ({ id: c.id, anio: c.anio, numero: c.numero, tipo: c.tipo_contador?.nombre ?? '' }));
  }

  async actualizarContador(id: number, numero: number) {
    const fila = await this.existe(this.contadorModel.findByPk(id), 'el contador');
    await fila.update({ numero });
    return { ok: true };
  }

  private async existe<M>(busqueda: Promise<M | null>, que: string): Promise<M> {
    const fila = await busqueda;
    if (!fila) throw new NotFoundException(`No existe ${que}`);
    return fila;
  }
}

/** Evita que el delito "OTRO" desaparezca: el formulario público depende de él. */
export function esDelitoProtegido(delito: string) {
  return delito.trim().toUpperCase() === 'OTRO';
}

/** "Otro" pide especificar la situación en el formulario público, por eso no se puede renombrar ni borrar. */
export function esSituacionProtegida(nombre: string) {
  return nombre.trim().toUpperCase() === 'OTRO';
}
