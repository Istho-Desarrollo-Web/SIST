import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { solicitudService } from '../services/solicitudService';
import { usuarioService } from '../services/usuarioService';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Pagination } from '../components/common/Pagination';
import { SkeletonTable } from '../components/common/Skeleton';
import { EstadoBadge } from '../components/solicitudes/EstadoBadge';
import { PrioridadBadge } from '../components/solicitudes/PrioridadBadge';
import { SLAIndicator } from '../components/solicitudes/SLAIndicator';
import { SolicitudModal } from '../components/solicitudes/SolicitudModal';
import { SolicitudForm } from '../components/solicitudes/SolicitudForm';
import { formatFecha } from '../utils/formatters';
import { ESTADOS_LABEL, PRIORIDADES_LABEL } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

export function SolicitudesPage() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ estado: '', prioridad: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);

  const cargar = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10, ...filters };
      const res = await solicitudService.listar(params);
      setSolicitudes(res.data.data);
      setPagination({ page: res.data.pagination.page, totalPages: res.data.pagination.totalPages });
    } catch {
      toast.error('Error cargando solicitudes');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { cargar(1); }, [cargar]);

  useEffect(() => {
    if (user.rol !== 'usuario') {
      usuarioService.listarTecnicos().then(r => setTecnicos(r.data.data));
    }
  }, [user.rol]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-500 dark:text-white">Solicitudes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de tickets de soporte</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto justify-center">
          <Plus size={16} />
          Nueva Solicitud
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filters.estado}
              onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select
              value={filters.prioridad}
              onChange={e => setFilters(f => ({ ...f, prioridad: e.target.value }))}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="">Todas las prioridades</option>
              {Object.entries(PRIORIDADES_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <Button variant="ghost" onClick={() => cargar(1)} size="md">
              <RefreshCw size={15} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista / Tabla */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonTable rows={5} cols={5} /></div>
        ) : solicitudes.length === 0 ? (
          <p className="py-10 text-center text-slate-400 text-sm">No hay solicitudes</p>
        ) : (
          <>
            {/* Tarjetas móvil */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-navy-600">
              {solicitudes.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="p-4 active:bg-slate-50 dark:active:bg-navy-700/50 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400 leading-tight">{s.numero}</span>
                    <PrioridadBadge prioridad={s.prioridad} />
                  </div>
                  <p className="text-sm font-medium text-navy-500 dark:text-white truncate mb-0.5">
                    {s.empleado?.nombreCompleto || '-'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 capitalize">
                    {s.tipoSolicitud?.replace(/_/g, ' ')}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <EstadoBadge estado={s.estado} />
                    <SLAIndicator porcentaje={s.porcentajeSLA} />
                    <span className="text-xs text-slate-400 whitespace-nowrap">{formatFecha(s.fechaCreacion)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla escritorio */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-navy-800">
                  <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    <th className="text-left px-4 py-3">Número</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Empleado</th>
                    <th className="text-left px-4 py-3">Prioridad</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">SLA</th>
                    <th className="text-left px-4 py-3">Técnico</th>
                    <th className="text-left px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-600">
                  {solicitudes.map(s => (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="hover:bg-slate-50 dark:hover:bg-navy-700/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">{s.numero}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-32 truncate">{s.tipoSolicitud?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{s.empleado?.nombreCompleto || '-'}</td>
                      <td className="px-4 py-3"><PrioridadBadge prioridad={s.prioridad} /></td>
                      <td className="px-4 py-3"><EstadoBadge estado={s.estado} /></td>
                      <td className="px-4 py-3"><SLAIndicator porcentaje={s.porcentajeSLA} /></td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.tecnico?.nombre || <span className="text-slate-400 italic">Sin asignar</span>}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatFecha(s.fechaCreacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="px-4 pb-4">
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={cargar} />
        </div>
      </Card>

      {selected && (
        <SolicitudModal
          solicitud={selected}
          tecnicos={tecnicos}
          onClose={() => setSelected(null)}
          onUpdate={() => { setSelected(null); cargar(pagination.page); }}
        />
      )}

      {showForm && (
        <SolicitudForm
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); cargar(1); toast.success('Solicitud creada correctamente'); }}
        />
      )}
    </div>
  );
}
