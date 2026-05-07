const { Op, fn, col, literal } = require('sequelize');
const { Solicitud, Usuario, sequelize } = require('../models');
const { calcularPorcentajeSLA } = require('../services/slaService');

async function resumen(req, res, next) {
  try {
    const ahora = new Date();

    const [total, abiertos, enProceso, resueltos, vencidos] = await Promise.all([
      Solicitud.count(),
      Solicitud.count({ where: { estado: 'abierto' } }),
      Solicitud.count({ where: { estado: 'en_proceso' } }),
      Solicitud.count({ where: { estado: ['resuelto', 'cerrado'] } }),
      Solicitud.count({
        where: {
          estado: { [Op.notIn]: ['resuelto', 'cerrado', 'cancelado'] },
          fechaLimiteResolucion: { [Op.lt]: ahora },
        },
      }),
    ]);

    const cumplidos = await Solicitud.count({
      where: {
        estado: ['resuelto', 'cerrado'],
        porcentajeSLA: { [Op.lte]: 100 },
      },
    });

    const porcentajeCumplimiento = resueltos > 0 ? Math.round((cumplidos / resueltos) * 100) : 0;

    res.json({
      success: true,
      data: { total, abiertos, enProceso, resueltos, vencidos, porcentajeCumplimiento },
    });
  } catch (err) { next(err); }
}

async function porTecnico(req, res, next) {
  try {
    const tecnicos = await Usuario.findAll({
      where: { rol: 'tecnico', activo: true },
      attributes: ['id', 'nombre', 'especialidad'],
    });

    const stats = await Promise.all(tecnicos.map(async (t) => {
      const [asignados, resueltos, vencidos] = await Promise.all([
        Solicitud.count({ where: { tecnicoAsignado: t.id, estado: { [Op.notIn]: ['cerrado', 'cancelado'] } } }),
        Solicitud.count({ where: { tecnicoAsignado: t.id, estado: ['resuelto', 'cerrado'] } }),
        Solicitud.count({
          where: {
            tecnicoAsignado: t.id,
            estado: { [Op.notIn]: ['resuelto', 'cerrado', 'cancelado'] },
            fechaLimiteResolucion: { [Op.lt]: new Date() },
          },
        }),
      ]);
      return { ...t.toJSON(), asignados, resueltos, vencidos };
    }));

    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}

async function metricasSLA(req, res, next) {
  try {
    const porPrioridad = await Solicitud.findAll({
      attributes: [
        'prioridad',
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal("CASE WHEN porcentajeSLA <= 100 THEN 1 ELSE 0 END")), 'cumplidos'],
      ],
      where: { estado: ['resuelto', 'cerrado'] },
      group: ['prioridad'],
      raw: true,
    });

    res.json({ success: true, data: porPrioridad });
  } catch (err) { next(err); }
}

async function tendencias(req, res, next) {
  try {
    const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const porDia = await Solicitud.findAll({
      attributes: [
        [fn('DATE', col('fechaCreacion')), 'fecha'],
        [fn('COUNT', col('id')), 'total'],
      ],
      where: { fechaCreacion: { [Op.gte]: hace30 } },
      group: [fn('DATE', col('fechaCreacion'))],
      order: [[fn('DATE', col('fechaCreacion')), 'ASC']],
      raw: true,
    });

    const porEstado = await Solicitud.findAll({
      attributes: ['estado', [fn('COUNT', col('id')), 'total']],
      group: ['estado'],
      raw: true,
    });

    res.json({ success: true, data: { porDia, porEstado } });
  } catch (err) { next(err); }
}

module.exports = { resumen, porTecnico, metricasSLA, tendencias };
