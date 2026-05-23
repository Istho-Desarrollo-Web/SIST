const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { Solicitud, Empleado, Usuario } = require('../models');

const PRIORIDAD_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };
const ESTADO_LABEL = {
  abierto:           'Abierto',
  en_analisis:       'En Análisis',
  en_proceso:        'En Proceso',
  pendiente_usuario: 'Pendiente Usuario',
  pendiente_externo: 'Pendiente Externo',
  resuelto:          'Resuelto',
  cerrado:           'Cerrado',
  rechazado:         'Rechazado',
};

function buildWhere(query) {
  const { fechaDesde, fechaHasta, estado, prioridad, tipoSolicitud, tecnico } = query;
  const where = {};

  if (fechaDesde || fechaHasta) {
    where.fechaCreacion = {};
    if (fechaDesde) where.fechaCreacion[Op.gte] = new Date(fechaDesde + 'T00:00:00');
    if (fechaHasta) where.fechaCreacion[Op.lte] = new Date(fechaHasta + 'T23:59:59');
  }
  if (estado) where.estado = estado;
  if (prioridad) where.prioridad = prioridad;
  if (tipoSolicitud) where.tipoSolicitud = tipoSolicitud;
  if (tecnico) where.tecnicoAsignado = parseInt(tecnico);

  return where;
}

async function obtenerDatos(where) {
  return Solicitud.findAll({
    where,
    include: [
      { model: Empleado, as: 'empleado', attributes: ['id', 'nombreCompleto', 'area', 'cargo'] },
      { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre'] },
    ],
    order: [['fechaCreacion', 'DESC']],
  });
}

async function listar(req, res, next) {
  try {
    const where = buildWhere(req.query);
    const { page = 1, limit = 20 } = req.query;

    const { count, rows } = await Solicitud.findAndCountAll({
      where,
      include: [
        { model: Empleado, as: 'empleado', attributes: ['id', 'nombreCompleto', 'area', 'cargo'] },
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre'] },
      ],
      order: [['fechaCreacion', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
}

async function exportarExcel(req, res, next) {
  try {
    const where = buildWhere(req.query);
    const solicitudes = await obtenerDatos(where);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Soporte TI ISTHO';
    wb.created = new Date();

    const ws = wb.addWorksheet('Solicitudes', {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { defaultRowHeight: 20 },
    });

    const NAVY    = 'FF1B2340';
    const ORANGE  = 'FFE8531E';
    const WHITE   = 'FFFFFFFF';

    const PRIORIDAD_COLORS = {
      critica: { bg: 'FFEDE9FE', font: 'FF6D28D9' },
      alta:    { bg: 'FFFEE2E2', font: 'FFB91C1C' },
      media:   { bg: 'FFFEF3C7', font: 'FFB45309' },
      baja:    { bg: 'FFDBEAFE', font: 'FF1D4ED8' },
    };
    const ESTADO_COLORS = {
      abierto:           { bg: 'FFDBEAFE', font: 'FF1D4ED8' },
      en_analisis:       { bg: 'FFE0F7FA', font: 'FF0E7490' },
      en_proceso:        { bg: 'FFFEF3C7', font: 'FFB45309' },
      pendiente_usuario: { bg: 'FFF3E8FF', font: 'FF7C3AED' },
      pendiente_externo: { bg: 'FFF3E8FF', font: 'FF7C3AED' },
      resuelto:          { bg: 'FFDCFCE7', font: 'FF166534' },
      cerrado:           { bg: 'FFF1F5F9', font: 'FF475569' },
      rechazado:         { bg: 'FFFEE2E2', font: 'FFB91C1C' },
    };

    // Anchos de columna
    const colWidths = [22, 20, 30, 22, 20, 24, 14, 18, 24, 10, 22, 14, 20];
    colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    // Filas de datos para la tabla
    const dataRows = solicitudes.map(s => [
      s.numero,
      s.fechaCreacion
        ? new Date(s.fechaCreacion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
        : '',
      s.empleado?.nombreCompleto || '-',
      s.empleado?.area || '-',
      s.empleado?.cargo || '-',
      (s.tipoSolicitud || '').replace(/_/g, ' '),
      PRIORIDAD_LABEL[s.prioridad] || s.prioridad,
      ESTADO_LABEL[s.estado] || s.estado,
      s.tecnico?.nombre || 'Sin asignar',
      s.porcentajeSLA != null ? s.porcentajeSLA : '',
      s.tiempoResolucionMinutos || '',
      s.calificacion || '',
      s.fechaResolucion
        ? new Date(s.fechaResolucion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
        : '',
    ]);

    // Tabla nativa Excel — con auto-filtros y bandas incorporadas
    ws.addTable({
      name: 'TablaSolicitudes',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: [
        { name: 'N° Ticket',              filterButton: true },
        { name: 'Fecha creación',         filterButton: true },
        { name: 'Empleado',               filterButton: true },
        { name: 'Área',                   filterButton: true },
        { name: 'Cargo',                  filterButton: true },
        { name: 'Tipo solicitud',         filterButton: true },
        { name: 'Prioridad',              filterButton: true },
        { name: 'Estado',                 filterButton: true },
        { name: 'Técnico asignado',       filterButton: true },
        { name: 'SLA %',                  filterButton: true },
        { name: 'T. resolución (min)',    filterButton: true },
        { name: 'Calificación',           filterButton: true },
        { name: 'Fecha resolución',       filterButton: true },
      ],
      rows: dataRows,
    });

    // Estilizar encabezado (fila 1) con colores Centhrix
    const headerRow = ws.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell(cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      cell.font   = { bold: true, size: 11, name: 'Calibri', color: { argb: WHITE } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { bottom: { style: 'medium', color: { argb: ORANGE } } };
    });

    // Estilizar celdas de datos
    solicitudes.forEach((s, i) => {
      const row = ws.getRow(i + 2);
      row.height = 20;
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = { size: 10, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', horizontal: col === 3 || col === 9 ? 'left' : 'center' };
      });

      // N° Ticket — naranja monospace
      const ticketCell = row.getCell(1);
      ticketCell.font = { size: 10, name: 'Consolas', bold: true, color: { argb: ORANGE } };

      // Prioridad
      const pc = PRIORIDAD_COLORS[s.prioridad];
      if (pc) {
        const c = row.getCell(7);
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pc.bg } };
        c.font = { size: 10, name: 'Calibri', bold: true, color: { argb: pc.font } };
      }

      // Estado
      const ec = ESTADO_COLORS[s.estado];
      if (ec) {
        const c = row.getCell(8);
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ec.bg } };
        c.font = { size: 10, name: 'Calibri', bold: true, color: { argb: ec.font } };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-solicitudes-${Date.now()}.xlsx"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

async function resumen(req, res, next) {
  try {
    const where = buildWhere(req.query);
    const solicitudes = await obtenerDatos(where);

    const porEstado = {};
    const porPrioridad = {};
    const porTipo = {};
    const porTecnico = {};
    let totalResueltos = 0, sumaTiempo = 0;

    solicitudes.forEach(s => {
      porEstado[s.estado] = (porEstado[s.estado] || 0) + 1;
      porPrioridad[s.prioridad] = (porPrioridad[s.prioridad] || 0) + 1;
      porTipo[s.tipoSolicitud] = (porTipo[s.tipoSolicitud] || 0) + 1;

      const tNombre = s.tecnico?.nombre || 'Sin asignar';
      porTecnico[tNombre] = (porTecnico[tNombre] || 0) + 1;

      if (s.tiempoResolucionMinutos) { totalResueltos++; sumaTiempo += s.tiempoResolucionMinutos; }
    });

    const solicitudesFinalizadas = solicitudes.filter(s => ['resuelto', 'cerrado'].includes(s.estado));
    const slaVencidos = solicitudesFinalizadas.filter(s => s.porcentajeSLA > 100).length;

    const empCount = {};
    solicitudes.forEach(s => {
      const nombre = s.empleado?.nombreCompleto;
      if (!nombre) return;
      empCount[nombre] = (empCount[nombre] || 0) + 1;
    });
    const topEmpleados = Object.entries(empCount)
      .map(([nombre, total]) => ({
        nombre,
        total,
        porcentaje: solicitudes.length > 0 ? Math.round((total / solicitudes.length) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        total: solicitudes.length,
        porEstado,
        porPrioridad,
        porTipo,
        porTecnico,
        tiempoPromedioResolucion: totalResueltos ? Math.round(sumaTiempo / totalResueltos) : null,
        slaVencidos,
        cumplimientoSLA: solicitudesFinalizadas.length
          ? Math.round(((solicitudesFinalizadas.length - slaVencidos) / solicitudesFinalizadas.length) * 100)
          : 100,
        topEmpleados,
      },
    });
  } catch (err) { next(err); }
}

module.exports = { listar, exportarExcel, resumen };
