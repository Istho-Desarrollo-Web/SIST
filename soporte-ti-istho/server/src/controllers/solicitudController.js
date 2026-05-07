const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { Solicitud, Empleado, Usuario } = require('../models');
const { calcularFechasSLA, calcularPorcentajeSLA } = require('../services/slaService');
const { registrarAuditoria } = require('../services/auditoriaService');
const { notificarNuevaSolicitud, notificarConfirmacionEmpleado, notificarCambioEstado } = require('../services/emailService');
const { ROLES } = require('../utils/constants');

function generarNumero() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `TKT-${y}${m}${d}-${rand}`;
}

async function listar(req, res, next) {
  try {
    const { page = 1, limit = 10, estado, prioridad, tecnico, search } = req.query;
    const where = {};

    // Técnico solo ve sus tickets + sin asignar
    if (req.user.rol === ROLES.TECNICO) {
      where[Op.or] = [
        { tecnicoAsignado: req.user.id },
        { tecnicoAsignado: null },
      ];
    }

    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;
    if (tecnico) where.tecnicoAsignado = tecnico;
    if (search) where.numero = { [Op.like]: `%${search}%` };

    const { count, rows } = await Solicitud.findAndCountAll({
      where,
      include: [
        { model: Empleado, as: 'empleado', attributes: ['id', 'nombreCompleto', 'area'] },
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre', 'especialidad'] },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['fechaCreacion', 'DESC']],
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const sol = await Solicitud.findByPk(req.params.id, {
      include: [
        { model: Empleado, as: 'empleado' },
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre', 'especialidad', 'email'] },
      ],
    });
    if (!sol) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    res.json({ success: true, data: sol });
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { empleado_id, tipoSolicitud, prioridad, descripcion } = req.body;
    const archivos = req.files ? req.files.map(f => ({ nombre: f.originalname, ruta: f.path, public_id: f.filename, size: f.size })) : [];

    const fechas = calcularFechasSLA(new Date(), prioridad);

    const sol = await Solicitud.create({
      numero: generarNumero(),
      empleado_id,
      tipoSolicitud,
      prioridad,
      descripcion,
      archivosAdjuntos: archivos,
      ...fechas,
    });

    await registrarAuditoria({
      tabla: 'solicitudes', registro_id: sol.id, operacion: 'INSERT',
      datos_nuevos: sol.toJSON(), usuario_id: req.user.id,
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    res.status(201).json({ success: true, data: sol, message: 'Solicitud creada' });
  } catch (err) { next(err); }
}

async function crearPublica(req, res, next) {
  try {
    const { identificacion, tipoSolicitud, prioridad, descripcion } = req.body;

    const empleado = await Empleado.findOne({ where: { identificacion: identificacion.trim(), activo: true } });
    if (!empleado) {
      return res.status(404).json({ success: false, message: 'No se encontró un empleado activo con esa identificación.' });
    }

    const archivos = req.files ? req.files.map(f => ({ nombre: f.originalname, ruta: f.path, public_id: f.filename, size: f.size })) : [];
    const fechas = calcularFechasSLA(new Date(), prioridad || 'media');

    const sol = await Solicitud.create({
      numero: generarNumero(),
      empleado_id: empleado.id,
      tipoSolicitud,
      prioridad: prioridad || 'media',
      descripcion,
      archivosAdjuntos: archivos,
      ...fechas,
    });

    await registrarAuditoria({
      tabla: 'solicitudes', registro_id: sol.id, operacion: 'INSERT',
      datos_nuevos: sol.toJSON(), usuario_id: null,
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    // Notificaciones en segundo plano (no bloquean la respuesta)
    notificarNuevaSolicitud(sol, empleado).catch(() => {});
    notificarConfirmacionEmpleado(sol, empleado).catch(() => {});

    res.status(201).json({
      success: true,
      data: {
        numero: sol.numero,
        prioridad: sol.prioridad,
        tipoSolicitud: sol.tipoSolicitud,
        fechaCreacion: sol.fechaCreacion,
        empleado: { nombreCompleto: empleado.nombreCompleto, area: empleado.area },
      },
      message: 'Solicitud creada. Recibirás actualizaciones por correo.',
    });
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const sol = await Solicitud.findByPk(req.params.id);
    if (!sol) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

    const anterior = sol.toJSON();
    await sol.update(req.body);

    await registrarAuditoria({
      tabla: 'solicitudes', registro_id: sol.id, operacion: 'UPDATE',
      datos_anteriores: anterior, datos_nuevos: sol.toJSON(),
      usuario_id: req.user.id, ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    res.json({ success: true, data: sol, message: 'Solicitud actualizada' });
  } catch (err) { next(err); }
}

async function cambiarEstado(req, res, next) {
  try {
    const { estado } = req.body;
    const sol = await Solicitud.findByPk(req.params.id);
    if (!sol) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

    const anterior = sol.estado;
    const updates = { estado };

    if (estado === 'en_proceso' && !sol.fechaPrimeraRespuesta) {
      updates.fechaPrimeraRespuesta = new Date();
    }
    if (estado === 'resuelto' || estado === 'cerrado') {
      updates.fechaResolucion = new Date();
      updates.tiempoResolucionMinutos = Math.round((new Date() - new Date(sol.fechaCreacion)) / 60000);
      updates.porcentajeSLA = calcularPorcentajeSLA(sol.fechaCreacion, sol.fechaLimiteResolucion, new Date());
    }

    await sol.update(updates);

    await registrarAuditoria({
      tabla: 'solicitudes', registro_id: sol.id, operacion: 'UPDATE',
      datos_anteriores: { estado: anterior }, datos_nuevos: { estado },
      campo_modificado: 'estado', usuario_id: req.user.id,
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    // Notificar al empleado del cambio de estado
    const empleado = await Empleado.findByPk(sol.empleado_id);
    notificarCambioEstado(sol, empleado, anterior, estado, req.body.comentarioNotificacion || null).catch(() => {});

    res.json({ success: true, data: sol, message: 'Estado actualizado' });
  } catch (err) { next(err); }
}

async function asignarTecnico(req, res, next) {
  try {
    const { tecnicoId } = req.body;
    const sol = await Solicitud.findByPk(req.params.id);
    if (!sol) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

    const anterior = sol.tecnicoAsignado;
    await sol.update({ tecnicoAsignado: tecnicoId, estado: sol.estado === 'abierto' ? 'en_proceso' : sol.estado });

    await registrarAuditoria({
      tabla: 'solicitudes', registro_id: sol.id, operacion: 'UPDATE',
      datos_anteriores: { tecnicoAsignado: anterior }, datos_nuevos: { tecnicoAsignado: tecnicoId },
      campo_modificado: 'tecnicoAsignado', usuario_id: req.user.id,
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    res.json({ success: true, data: sol, message: 'Técnico asignado' });
  } catch (err) { next(err); }
}

async function agregarComentario(req, res, next) {
  try {
    const { texto } = req.body;
    const sol = await Solicitud.findByPk(req.params.id);
    if (!sol) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

    const comentarios = Array.isArray(sol.comentarios) ? sol.comentarios : [];
    comentarios.push({
      id: uuidv4(),
      texto,
      autor: req.user.nombre,
      autorId: req.user.id,
      fecha: new Date().toISOString(),
    });

    await sol.update({ comentarios });
    res.json({ success: true, data: sol, message: 'Comentario agregado' });
  } catch (err) { next(err); }
}

async function calificar(req, res, next) {
  try {
    const { calificacion, comentarioCalificacion } = req.body;
    const sol = await Solicitud.findByPk(req.params.id);
    if (!sol) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

    await sol.update({ calificacion, comentarioCalificacion });
    res.json({ success: true, data: sol, message: 'Calificación registrada' });
  } catch (err) { next(err); }
}

async function misTickets(req, res, next) {
  try {
    const solicitudes = await Solicitud.findAll({
      where: { tecnicoAsignado: req.user.id },
      include: [{ model: Empleado, as: 'empleado', attributes: ['id', 'nombreCompleto', 'area'] }],
      order: [['fechaCreacion', 'DESC']],
    });
    res.json({ success: true, data: solicitudes });
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, crearPublica, actualizar, cambiarEstado, asignarTecnico, agregarComentario, calificar, misTickets };
