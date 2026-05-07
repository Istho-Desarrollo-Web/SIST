const { Op } = require('sequelize');
const { Usuario } = require('../models');
const { registrarAuditoria } = require('../services/auditoriaService');

async function listar(req, res, next) {
  try {
    const { page = 1, limit = 10, rol, activo } = req.query;
    const where = {};
    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo === 'true';

    const { count, rows } = await Usuario.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['nombre', 'ASC']],
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
}

async function listarTecnicos(req, res, next) {
  try {
    const tecnicos = await Usuario.findAll({
      where: { rol: 'tecnico', activo: true },
      order: [['nombre', 'ASC']],
    });
    res.json({ success: true, data: tecnicos });
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const user = await Usuario.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const user = await Usuario.create({ ...req.body, password_hash: req.body.password });
    await registrarAuditoria({
      tabla: 'usuarios', registro_id: user.id, operacion: 'INSERT',
      datos_nuevos: user.toJSON(), usuario_id: req.user.id,
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    res.status(201).json({ success: true, data: user, message: 'Usuario creado' });
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const user = await Usuario.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const anterior = user.toJSON();
    const updates = { ...req.body };
    if (updates.password) { updates.password_hash = updates.password; delete updates.password; }

    await user.update(updates);

    await registrarAuditoria({
      tabla: 'usuarios', registro_id: user.id, operacion: 'UPDATE',
      datos_anteriores: anterior, datos_nuevos: user.toJSON(),
      usuario_id: req.user.id, ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    res.json({ success: true, data: user, message: 'Usuario actualizado' });
  } catch (err) { next(err); }
}

async function desactivar(req, res, next) {
  try {
    if (req.params.id == req.user.id) {
      return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta' });
    }
    const user = await Usuario.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    await user.update({ activo: false });

    await registrarAuditoria({
      tabla: 'usuarios', registro_id: user.id, operacion: 'DELETE',
      datos_nuevos: { activo: false }, usuario_id: req.user.id,
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Usuario desactivado' });
  } catch (err) { next(err); }
}

module.exports = { listar, listarTecnicos, obtener, crear, actualizar, desactivar };
