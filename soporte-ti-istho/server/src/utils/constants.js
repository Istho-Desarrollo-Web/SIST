const ROLES = { ADMIN: 'admin', TECNICO: 'tecnico', USUARIO: 'usuario' };

const ESTADOS = {
  ABIERTO: 'abierto',
  EN_PROCESO: 'en_proceso',
  PENDIENTE_USUARIO: 'pendiente_usuario',
  PENDIENTE_EXTERNO: 'pendiente_externo',
  RESUELTO: 'resuelto',
  CERRADO: 'cerrado',
  CANCELADO: 'cancelado',
};

const PRIORIDADES = { CRITICA: 'critica', ALTA: 'alta', MEDIA: 'media', BAJA: 'baja' };

const TIPOS_SOLICITUD = [
  'soporte_hardware', 'soporte_software', 'redes_conectividad', 'accesos_permisos',
  'correo_electronico', 'impresoras', 'telefonia', 'capacitacion', 'otro',
];

// SLA en minutos
const SLA_CONFIG = {
  critica: { respuesta: 30, resolucion: 240, tipo: 'natural' },
  alta:    { respuesta: 120, resolucion: 480, tipo: 'habil' },
  media:   { respuesta: 480, resolucion: 1440, tipo: 'habil' },
  baja:    { respuesta: 1440, resolucion: 2880, tipo: 'habil' },
};

const FESTIVOS_COLOMBIA_2026 = [
  '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03',
  '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29',
  '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02',
  '2026-11-16', '2026-12-08', '2026-12-25',
];

const HORARIO_ISTHO = {
  lunesViernes: { inicio: 8, fin: 17 },
  sabado: { inicio: 8, fin: 12 },
};

module.exports = { ROLES, ESTADOS, PRIORIDADES, TIPOS_SOLICITUD, SLA_CONFIG, FESTIVOS_COLOMBIA_2026, HORARIO_ISTHO };
