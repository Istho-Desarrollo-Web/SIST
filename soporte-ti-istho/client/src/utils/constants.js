export const ROLES = { ADMIN: 'admin', TECNICO: 'tecnico', USUARIO: 'usuario' };

export const ESTADOS_LABEL = {
  abierto: 'Abierto',
  en_proceso: 'En Proceso',
  pendiente_usuario: 'Pendiente Usuario',
  pendiente_externo: 'Pendiente Externo',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
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
  critica: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  alta: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  media: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  baja: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export const ESTADO_COLORS = {
  abierto: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  en_proceso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  pendiente_usuario: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  pendiente_externo: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  resuelto: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cerrado: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};
