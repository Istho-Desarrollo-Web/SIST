export const ROLES = { ADMIN: 'admin', TECNICO: 'tecnico', USUARIO: 'usuario' };

export const ESTADOS_LABEL = {
  abierto:           'Abierto',
  en_analisis:       'En Análisis',
  en_proceso:        'En Proceso',
  pendiente_usuario: 'Pendiente Usuario',
  pendiente_externo: 'Pendiente Externo',
  resuelto:          'Resuelto',
  cerrado:           'Cerrado',
  rechazado:         'Rechazado',
};

export const PRIORIDADES_LABEL = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const TIPOS_SOLICITUD_LABEL = {
  soporte_hardware: 'Soporte Hardware',
  soporte_software: 'Soporte Software',
  redes_conectividad: 'Redes y Conectividad',
  accesos_permisos: 'Accesos y Permisos',
  correo_electronico: 'Correo Electrónico',
  impresoras: 'Impresoras',
  telefonia: 'Telefonía',
  capacitacion: 'Capacitación',
  otro: 'Otro',
};

export const PRIORIDAD_COLORS = {
  critica: 'cx-tag-danger',
  alta: 'cx-tag-warning',
  media: 'cx-tag-info',
  baja: 'cx-tag-neutral',
};

export const ESTADO_COLORS = {
  abierto:           'cx-tag-info',
  en_analisis:       'cx-tag-outline',
  en_proceso:        'cx-tag-warning',
  pendiente_usuario: 'cx-tag-outline',
  pendiente_externo: 'cx-tag-outline',
  resuelto:          'cx-tag-success',
  cerrado:           'cx-tag-neutral',
  rechazado:         'cx-tag-danger',
};
