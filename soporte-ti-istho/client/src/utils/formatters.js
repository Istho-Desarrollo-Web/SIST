import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatFecha(fecha) {
  if (!fecha) return '-';
  return format(parseISO(String(fecha)), 'dd/MM/yyyy HH:mm', { locale: es });
}

export function formatFechaCorta(fecha) {
  if (!fecha) return '-';
  return format(parseISO(String(fecha)), 'dd/MM/yyyy', { locale: es });
}

export function formatRelativo(fecha) {
  if (!fecha) return '-';
  return formatDistanceToNow(parseISO(String(fecha)), { addSuffix: true, locale: es });
}

export function formatMinutos(minutos) {
  if (!minutos) return '-';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function slaColor(porcentaje) {
  if (porcentaje === null || porcentaje === undefined) return 'bg-slate-200';
  if (porcentaje <= 75) return 'bg-cgreen-500';
  if (porcentaje <= 100) return 'bg-amber-500';
  return 'bg-red-500';
}

export function slaTextColor(porcentaje) {
  if (porcentaje === null || porcentaje === undefined) return 'text-slate-500';
  if (porcentaje <= 75) return 'text-cgreen-600';
  if (porcentaje <= 100) return 'text-amber-600';
  return 'text-red-600';
}
