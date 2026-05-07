const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { Empleado } = require('../models');
const { registrarAuditoria } = require('../services/auditoriaService');

// Normaliza un texto para comparar nombres de columna
function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');
}

const COL_ALIASES = {
  identificacion: ['identificacion', 'id', 'cedula', 'numerodocumento', 'documento'],
  nombreCompleto: ['nombrecompleto', 'nombre', 'nombresyapellidos', 'empleado'],
  area:           ['area', 'departamento', 'sector'],
  cargo:          ['cargo', 'puesto', 'posicion'],
  email:          ['email', 'correo', 'correoelectronico'],
  telefono:       ['telefono', 'phone', 'tel', 'celular'],
  activo:         ['activo', 'estado', 'active', 'habilitado'],
};

function parsearActivo(val) {
  const v = String(val ?? '').trim().toLowerCase();
  if (['no', 'false', '0', 'inactivo', 'desactivado'].includes(v)) return false;
  return true; // vacío o cualquier valor afirmativo → activo
}

function mapearColumnas(headerRow) {
  const map = {}; // field -> colIndex (1-based)
  headerRow.eachCell((cell, col) => {
    const val = norm(cell.value);
    for (const [field, aliases] of Object.entries(COL_ALIASES)) {
      if (aliases.includes(val)) map[field] = col;
    }
  });
  return map;
}

async function listar(req, res, next) {
  try {
    const { page = 1, limit = 10, search, activo } = req.query;
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (search) {
      where[Op.or] = [
        { nombreCompleto: { [Op.like]: `%${search}%` } },
        { identificacion: { [Op.like]: `%${search}%` } },
        { area: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Empleado.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['nombreCompleto', 'ASC']],
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
    const emp = await Empleado.findByPk(req.params.id);
    if (!emp) return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    res.json({ success: true, data: emp });
  } catch (err) { next(err); }
}

async function buscar(req, res, next) {
  try {
    const { identificacion } = req.query;
    const emp = await Empleado.findOne({ where: { identificacion, activo: true } });
    if (!emp) return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    res.json({ success: true, data: emp });
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const emp = await Empleado.create(req.body);
    await registrarAuditoria({
      tabla: 'empleados', registro_id: emp.id, operacion: 'INSERT',
      datos_nuevos: emp.toJSON(), usuario_id: req.user.id,
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    res.status(201).json({ success: true, data: emp, message: 'Empleado creado' });
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const emp = await Empleado.findByPk(req.params.id);
    if (!emp) return res.status(404).json({ success: false, message: 'Empleado no encontrado' });

    const anterior = emp.toJSON();
    await emp.update(req.body);

    await registrarAuditoria({
      tabla: 'empleados', registro_id: emp.id, operacion: 'UPDATE',
      datos_anteriores: anterior, datos_nuevos: emp.toJSON(),
      usuario_id: req.user.id, ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    res.json({ success: true, data: emp, message: 'Empleado actualizado' });
  } catch (err) { next(err); }
}

async function desactivar(req, res, next) {
  try {
    const emp = await Empleado.findByPk(req.params.id);
    if (!emp) return res.status(404).json({ success: false, message: 'Empleado no encontrado' });

    await emp.update({ activo: false });

    await registrarAuditoria({
      tabla: 'empleados', registro_id: emp.id, operacion: 'DELETE',
      datos_anteriores: { activo: true }, datos_nuevos: { activo: false },
      usuario_id: req.user.id, ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Empleado desactivado' });
  } catch (err) { next(err); }
}

async function importar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Archivo requerido' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];
    if (!ws) return res.status(400).json({ success: false, message: 'El archivo no tiene hojas' });

    const colMap = mapearColumnas(ws.getRow(1));
    if (!colMap.identificacion || !colMap.nombreCompleto || !colMap.area) {
      return res.status(400).json({
        success: false,
        message: 'El archivo debe tener columnas: Identificacion, NombreCompleto, Area',
      });
    }

    const results = { creados: 0, omitidos: 0, errores: [] };

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const val = (col) => col ? String(row.getCell(col).value ?? '').trim() : '';

      const identificacion = val(colMap.identificacion);
      const nombreCompleto = val(colMap.nombreCompleto);
      const area           = val(colMap.area);

      if (!identificacion && !nombreCompleto) continue; // fila vacía

      if (!identificacion || !nombreCompleto || !area) {
        results.errores.push({ fila: r, mensaje: 'Faltan campos obligatorios (identificacion, nombreCompleto, area)' });
        continue;
      }

      const existe = await Empleado.findOne({ where: { identificacion } });
      if (existe) { results.omitidos++; continue; }

      try {
        const emp = await Empleado.create({
          identificacion,
          nombreCompleto,
          area,
          cargo:    val(colMap.cargo)    || null,
          email:    val(colMap.email)    || null,
          telefono: val(colMap.telefono) || null,
          activo:   colMap.activo ? parsearActivo(row.getCell(colMap.activo).value) : true,
        });
        await registrarAuditoria({
          tabla: 'empleados', registro_id: emp.id, operacion: 'INSERT',
          datos_nuevos: emp.toJSON(), usuario_id: req.user.id,
          ip_address: req.ip, user_agent: req.headers['user-agent'],
        });
        results.creados++;
      } catch (e) {
        results.errores.push({ fila: r, mensaje: e.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (err) { next(err); }
}

async function descargarPlantilla(req, res, next) {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Empleados');

    ws.addTable({
      name: 'PlantillaEmpleados',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: [
        { name: 'Identificacion', filterButton: true },
        { name: 'NombreCompleto', filterButton: true },
        { name: 'Area',           filterButton: true },
        { name: 'Cargo',          filterButton: true },
        { name: 'Email',          filterButton: true },
        { name: 'Telefono',       filterButton: true },
        { name: 'Activo',         filterButton: true },
      ],
      rows: [['12345678', 'Ejemplo Apellido', 'Sistemas', 'Analista', 'ejemplo@istho.com.co', '3001234567', 'SI']],
    });

    [20, 30, 20, 20, 28, 16, 10].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    const headerRow = ws.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2340' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-empleados.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, buscar, crear, actualizar, desactivar, importar, descargarPlantilla };
