'use strict';

const { Solicitud, Auditoria, Usuario, Empleado } = require('../models');
const { calcularFechasSLA, calcularPorcentajeSLA } = require('../services/slaService');

const NUMERO_PREFIX = 'TKT-DEMO-';

const horasAtras = (h) => new Date(Date.now() - h * 60 * 60 * 1000);

// tipo/prioridad/estado/creación(h atrás)/resolución(h atrás o null)/técnico(email o null)/empleado(índice 0-2)
const PLAN = [
  ['redes_conectividad', 'alta', 'abierto', 2, null, 'carlos.tecnico@istho.com.co', 0],
  ['soporte_software', 'media', 'en_proceso', 20, null, 'carlos.tecnico@istho.com.co', 1],
  ['accesos_permisos', 'critica', 'en_analisis', 1, null, 'maria.tecnico@istho.com.co', 2],
  ['impresoras', 'baja', 'pendiente_usuario', 170, null, 'carlos.tecnico@istho.com.co', 0],
  ['correo_electronico', 'media', 'pendiente_externo', 55, null, null, 1],
  ['soporte_hardware', 'alta', 'resuelto', 120, 108, 'maria.tecnico@istho.com.co', 2],
  ['telefonia', 'media', 'resuelto', 145, 97, 'carlos.tecnico@istho.com.co', 0],
  ['capacitacion', 'baja', 'resuelto', 190, 145, 'maria.tecnico@istho.com.co', 1],
  ['redes_conectividad', 'critica', 'cerrado', 235, 229, 'carlos.tecnico@istho.com.co', 2],
  ['soporte_software', 'media', 'cerrado', 280, 235, 'maria.tecnico@istho.com.co', 0],
  ['otro', 'baja', 'rechazado', 96, 90, 'carlos.tecnico@istho.com.co', 1],
  ['soporte_hardware', 'media', 'abierto', 44, null, null, 2],
  ['accesos_permisos', 'critica', 'en_proceso', 3, null, 'maria.tecnico@istho.com.co', 0],
  ['correo_electronico', 'critica', 'resuelto', 168, 164, 'carlos.tecnico@istho.com.co', 1],
];

module.exports = {
  async up() {
    const [carlos, maria] = await Promise.all([
      Usuario.findOne({ where: { email: 'carlos.tecnico@istho.com.co' } }),
      Usuario.findOne({ where: { email: 'maria.tecnico@istho.com.co' } }),
    ]);
    const tecnicosPorEmail = {
      'carlos.tecnico@istho.com.co': carlos?.id,
      'maria.tecnico@istho.com.co': maria?.id,
    };
    const empleados = await Empleado.findAll({ order: [['id', 'ASC']], limit: 3 });
    if (empleados.length < 3 || !carlos || !maria) {
      console.warn('[seed-solicitudes-demo] Faltan empleados o técnicos base — se omite el seed de solicitudes demo.');
      return;
    }

    let seq = 1;
    for (const [tipoSolicitud, prioridad, estado, horasCreacion, horasResolucion, tecnicoEmail, empIdx] of PLAN) {
      const fechaCreacion = horasAtras(horasCreacion);
      const { fechaLimiteRespuesta, fechaLimiteResolucion } = calcularFechasSLA(fechaCreacion, prioridad);
      const fechaResolucion = horasResolucion != null ? horasAtras(horasResolucion) : null;
      const esFinal = ['resuelto', 'cerrado', 'rechazado'].includes(estado);
      const porcentajeSLA = esFinal
        ? calcularPorcentajeSLA(fechaCreacion, fechaLimiteResolucion, fechaResolucion || fechaCreacion)
        : calcularPorcentajeSLA(fechaCreacion, fechaLimiteResolucion, new Date());

      const sol = await Solicitud.create({
        numero: `${NUMERO_PREFIX}${String(seq).padStart(4, '0')}`,
        empleado_id: empleados[empIdx].id,
        tipoSolicitud,
        prioridad,
        descripcion: `Solicitud de demostración generada por el seeder (${tipoSolicitud.replace(/_/g, ' ')}).`,
        estado,
        tecnicoAsignado: tecnicoEmail ? tecnicosPorEmail[tecnicoEmail] : null,
        fechaCreacion,
        fechaLimiteRespuesta,
        fechaLimiteResolucion,
        fechaPrimeraRespuesta: tecnicoEmail ? horasAtras(Math.max(horasCreacion - 1, 0)) : null,
        fechaResolucion,
        tiempoResolucionMinutos: fechaResolucion ? Math.round((fechaResolucion - fechaCreacion) / 60000) : null,
        porcentajeSLA,
      });

      const usuarioCreador = tecnicoEmail ? tecnicosPorEmail[tecnicoEmail] : null;
      await Auditoria.create({
        tabla: 'solicitudes', registro_id: sol.id, operacion: 'INSERT',
        datos_nuevos: sol.toJSON(), usuario_id: usuarioCreador, created_at: fechaCreacion,
      });
      if (estado !== 'abierto') {
        await Auditoria.create({
          tabla: 'solicitudes', registro_id: sol.id, operacion: 'UPDATE',
          datos_anteriores: { estado: 'abierto' }, datos_nuevos: { estado },
          campo_modificado: 'estado', usuario_id: usuarioCreador,
          created_at: fechaResolucion || horasAtras(Math.max(horasCreacion - 2, 0)),
        });
      }
      seq += 1;
    }
  },

  async down() {
    const solicitudes = await Solicitud.findAll({ where: { numero: { [require('sequelize').Op.like]: `${NUMERO_PREFIX}%` } } });
    const ids = solicitudes.map(s => s.id);
    if (ids.length > 0) {
      await Auditoria.destroy({ where: { tabla: 'solicitudes', registro_id: ids } });
      await Solicitud.destroy({ where: { id: ids } });
    }
  },
};
