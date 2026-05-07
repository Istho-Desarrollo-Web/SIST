import { useState, useEffect, useCallback } from 'react';
import { FileDown, RefreshCw, BarChart2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { reportesService } from '../services/reportesService';
import { usuarioService } from '../services/usuarioService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Pagination } from '../components/common/Pagination';
import { DatePicker } from '../components/common/DatePicker';
import { Select } from '../components/common/Select';
import { EstadoBadge } from '../components/solicitudes/EstadoBadge';
import { PrioridadBadge } from '../components/solicitudes/PrioridadBadge';
import { SLAIndicator } from '../components/solicitudes/SLAIndicator';
import { formatFecha, formatMinutos } from '../utils/formatters';
import { ESTADOS_LABEL, PRIORIDADES_LABEL, TIPOS_SOLICITUD_LABEL } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const EMPTY_FILTERS = {
  fechaDesde: '', fechaHasta: '', estado: '', prioridad: '', tipoSolicitud: '', tecnico: '',
};

function ResumenCard({ label, value, sub, color = 'navy' }) {
  const colorMap = {
    navy: 'text-navy-500 dark:text-white',
    orange: 'text-orange-500',
    green: 'text-cgreen-500',
    red: 'text-red-500',
  };
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </Card>
  );
}

export function ReportesPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [solicitudes, setSolicitudes] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);

  useEffect(() => {
    if (user.rol === 'admin') {
      usuarioService.listarTecnicos().then(r => setTecnicos(r.data.data)).catch(() => {});
    }
  }, [user.rol]);

  const cargar = useCallback(async (page = 1, params = applied) => {
    setLoading(true);
    try {
      const [dataRes, resumenRes] = await Promise.all([
        reportesService.listar({ ...params, page, limit: 15 }),
        reportesService.resumen(params),
      ]);
      setSolicitudes(dataRes.data.data);
      setPagination({ page: dataRes.data.pagination.page, totalPages: dataRes.data.pagination.totalPages });
      setResumen(resumenRes.data.data);
    } catch {
      toast.error('Error cargando reportes');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => { cargar(1); }, [cargar]);

  const aplicarFiltros = () => {
    setApplied({ ...filters });
    cargar(1, filters);
  };

  const limpiarFiltros = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    cargar(1, EMPTY_FILTERS);
  };

  const exportar = () => {
    const url = reportesService.exportarUrl(applied);
    const token = localStorage.getItem('token');
    // Creamos un link temporal con el token en header via fetch
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `reporte-solicitudes-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error('Error al exportar'));
  };

  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-500 dark:text-white flex items-center gap-2">
            <BarChart2 size={22} className="text-orange-500" />
            Reportes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Análisis y exportación de solicitudes de soporte</p>
        </div>
        <Button onClick={exportar} variant="secondary">
          <FileDown size={16} />
          Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <DatePicker
            label="Desde"
            value={filters.fechaDesde}
            onChange={v => setF('fechaDesde', v)}
          />
          <DatePicker
            label="Hasta"
            value={filters.fechaHasta}
            onChange={v => setF('fechaHasta', v)}
          />
          <Select
            label="Estado"
            value={filters.estado}
            onChange={v => setF('estado', v)}
            options={[
              { value: '', label: 'Todos' },
              ...Object.entries(ESTADOS_LABEL).map(([v, l]) => ({ value: v, label: l })),
            ]}
          />
          <Select
            label="Prioridad"
            value={filters.prioridad}
            onChange={v => setF('prioridad', v)}
            options={[
              { value: '', label: 'Todas' },
              ...Object.entries(PRIORIDADES_LABEL).map(([v, l]) => ({ value: v, label: l })),
            ]}
          />
          <Select
            label="Tipo"
            value={filters.tipoSolicitud}
            onChange={v => setF('tipoSolicitud', v)}
            options={[
              { value: '', label: 'Todos' },
              ...Object.entries(TIPOS_SOLICITUD_LABEL).map(([v, l]) => ({ value: v, label: l })),
            ]}
          />
          {user.rol === 'admin' && (
            <Select
              label="Técnico"
              value={filters.tecnico}
              onChange={v => setF('tecnico', v)}
              options={[
                { value: '', label: 'Todos' },
                ...tecnicos.map(t => ({ value: t.id, label: t.nombre })),
              ]}
            />
          )}
        </div>
        <div className="flex gap-2 mt-3 justify-end">
          <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
            <RefreshCw size={14} />
            Limpiar
          </Button>
          <Button size="sm" onClick={aplicarFiltros}>
            Aplicar filtros
          </Button>
        </div>
      </Card>

      {/* Tarjetas resumen */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ResumenCard label="Total tickets" value={resumen.total} color="navy" />
          <ResumenCard
            label="Cumplimiento SLA"
            value={`${resumen.cumplimientoSLA}%`}
            sub={`${resumen.slaVencidos} vencidos`}
            color={resumen.cumplimientoSLA >= 80 ? 'green' : 'red'}
          />
          <ResumenCard
            label="Tiempo prom. resolución"
            value={resumen.tiempoPromedioResolucion ? formatMinutos(resumen.tiempoPromedioResolucion) : '—'}
            color="orange"
          />
          <ResumenCard
            label="Tickets resueltos"
            value={resumen.porEstado?.resuelto || 0}
            sub={`${resumen.porEstado?.cerrado || 0} cerrados`}
            color="green"
          />
        </div>
      )}

      {/* Distribución */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Por estado */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-orange-500" /> Por estado
            </h3>
            <div className="space-y-2">
              {Object.entries(resumen.porEstado).map(([estado, n]) => (
                <div key={estado} className="flex items-center justify-between">
                  <EstadoBadge estado={estado} />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{n}</span>
                </div>
              ))}
            </div>
          </Card>
          {/* Por prioridad */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-orange-500" /> Por prioridad
            </h3>
            <div className="space-y-2">
              {Object.entries(resumen.porPrioridad).map(([p, n]) => (
                <div key={p} className="flex items-center justify-between">
                  <PrioridadBadge prioridad={p} />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{n}</span>
                </div>
              ))}
            </div>
          </Card>
          {/* Por técnico */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-orange-500" /> Por técnico
            </h3>
            <div className="space-y-2">
              {Object.entries(resumen.porTecnico).map(([nombre, n]) => (
                <div key={nombre} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{nombre}</span>
                  <span className="text-sm font-bold text-navy-500 dark:text-white shrink-0">{n}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-navy-800">
              <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <th className="text-left px-4 py-3">N° Ticket</th>
                <th className="text-left px-4 py-3">Empleado</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Prioridad</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Técnico</th>
                <th className="text-left px-4 py-3">SLA</th>
                <th className="text-left px-4 py-3">T. Resolución</th>
                <th className="text-left px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-600">
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400">Cargando...</td></tr>
              ) : solicitudes.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400">No hay datos para los filtros seleccionados</td></tr>
              ) : solicitudes.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-navy-700/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">{s.numero}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 dark:text-slate-200 font-medium leading-tight">{s.empleado?.nombreCompleto || '-'}</p>
                    <p className="text-xs text-slate-400">{s.empleado?.area}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-28 truncate capitalize">{(s.tipoSolicitud || '').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3"><PrioridadBadge prioridad={s.prioridad} /></td>
                  <td className="px-4 py-3"><EstadoBadge estado={s.estado} /></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{s.tecnico?.nombre || <span className="text-slate-400 italic">Sin asignar</span>}</td>
                  <td className="px-4 py-3"><SLAIndicator porcentaje={s.porcentajeSLA} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {s.tiempoResolucionMinutos ? formatMinutos(s.tiempoResolucionMinutos) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatFecha(s.fechaCreacion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(p) => cargar(p)} />
        </div>
      </Card>
    </div>
  );
}
