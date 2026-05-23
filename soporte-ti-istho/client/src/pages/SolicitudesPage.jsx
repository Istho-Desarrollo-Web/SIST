import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, RefreshCw, CheckSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { solicitudService } from '../services/solicitudService';
import { usuarioService } from '../services/usuarioService';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Select } from '../components/common/Select';
import { Pagination } from '../components/common/Pagination';
import { SkeletonTable, SkeletonCard } from '../components/common/Skeleton';
import { EstadoBadge } from '../components/solicitudes/EstadoBadge';
import { PrioridadBadge } from '../components/solicitudes/PrioridadBadge';
import { SLAIndicator } from '../components/solicitudes/SLAIndicator';
import { SolicitudModal } from '../components/solicitudes/SolicitudModal';
import { SolicitudForm } from '../components/solicitudes/SolicitudForm';
import { formatFecha, formatFechaCorta } from '../utils/formatters';
import { ESTADOS_LABEL, PRIORIDADES_LABEL } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const ESTADOS_BULK = [
  'abierto', 'en_analisis', 'en_proceso',
  'pendiente_usuario', 'pendiente_externo',
  'resuelto', 'cerrado',
];

export function SolicitudesPage() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ estado: '', prioridad: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);

  // Selección masiva
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkEstado, setBulkEstado] = useState('');
  const [bulkTecnico, setBulkTecnico] = useState('');
  const [loadingEstado, setLoadingEstado] = useState(false);
  const [loadingTecnico, setLoadingTecnico] = useState(false);

  // Checkbox indeterminate en header (desktop y móvil)
  const checkboxHeaderDesktopRef = useRef(null);
  const checkboxHeaderMobileRef = useRef(null);

  const cargar = useCallback(async (page = 1) => {
    setLoading(true);
    setSelectedIds(new Set());
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

  // --- Selección ---
  const toggleId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const todosSeleccionados = solicitudes.length > 0 && solicitudes.every(s => selectedIds.has(s.id));
  const algunoSeleccionado = selectedIds.size > 0 && !todosSeleccionados;

  useEffect(() => {
    [checkboxHeaderDesktopRef, checkboxHeaderMobileRef].forEach(ref => {
      if (ref.current) ref.current.indeterminate = algunoSeleccionado;
    });
  }, [algunoSeleccionado]);

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(solicitudes.map(s => s.id)));
    }
  };

  // --- Acción masiva ---
  const ejecutarBulk = async (accion) => {
    const valor = accion === 'cambiar_estado' ? bulkEstado : bulkTecnico;
    if (!valor) { toast.error(accion === 'cambiar_estado' ? 'Selecciona un estado' : 'Selecciona un técnico'); return; }
    const setLoading = accion === 'cambiar_estado' ? setLoadingEstado : setLoadingTecnico;
    setLoading(true);
    try {
      const res = await solicitudService.bulkAction({ ids: Array.from(selectedIds), accion, valor });
      toast.success(res.data.message);
      setBulkEstado('');
      setBulkTecnico('');
      cargar(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aplicar la acción');
    } finally {
      setLoading(false);
    }
  };

  const canBulk = user.rol !== 'usuario';

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
              placeholder="Buscar por número o empleado..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={filters.estado}
                onChange={val => setFilters(f => ({ ...f, estado: val }))}
                placeholder="Todos los estados"
                options={[
                  { value: '', label: 'Todos los estados' },
                  ...Object.entries(ESTADOS_LABEL).map(([v, l]) => ({ value: v, label: l })),
                ]}
              />
            </div>
            <div className="flex-1">
              <Select
                value={filters.prioridad}
                onChange={val => setFilters(f => ({ ...f, prioridad: val }))}
                placeholder="Todas las prioridades"
                options={[
                  { value: '', label: 'Todas las prioridades' },
                  ...Object.entries(PRIORIDADES_LABEL).map(([v, l]) => ({ value: v, label: l })),
                ]}
              />
            </div>
            <Button variant="ghost" onClick={() => cargar(1)} size="md">
              <RefreshCw size={15} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista / Tabla */}
      <Card className="overflow-hidden">
        {loading ? (
          <>
            {/* Mobile skeleton */}
            <div className="block sm:hidden"><SkeletonCard rows={4} /></div>
            {/* Desktop skeleton */}
            <div className="hidden sm:block p-4"><SkeletonTable rows={5} cols={7} /></div>
          </>
        ) : solicitudes.length === 0 ? (
          <p className="py-10 text-center text-slate-400 text-sm">No hay solicitudes</p>
        ) : (
          <>
            {/* Tarjetas móvil */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-navy-600">
              {canBulk && (
                <div className="px-4 py-2 flex items-center gap-2 bg-slate-50 dark:bg-navy-800">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    ref={checkboxHeaderMobileRef}
                    onChange={toggleTodos}
                    className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Seleccionar página</span>
                </div>
              )}
              {solicitudes.map(s => (
                <div
                  key={s.id}
                  className={`p-4 active:bg-slate-50 dark:active:bg-navy-700/50 transition-colors ${selectedIds.has(s.id) ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {canBulk && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleId(s.id)}
                        onClick={e => e.stopPropagation()}
                        className="mt-0.5 w-4 h-4 rounded accent-orange-500 cursor-pointer shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelected(s)}>
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
                        <div className="flex items-center gap-2 min-w-0">
                          <EstadoBadge estado={s.estado} />
                          <SLAIndicator porcentaje={s.porcentajeSLA} />
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{formatFechaCorta(s.fechaCreacion)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla escritorio */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-navy-800">
                  <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    {canBulk && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={todosSeleccionados}
                          ref={checkboxHeaderDesktopRef}
                          onChange={toggleTodos}
                          className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                        />
                      </th>
                    )}
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
                      className={`hover:bg-slate-50 dark:hover:bg-navy-700/50 transition-colors ${selectedIds.has(s.id) ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                    >
                      {canBulk && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleId(s.id)}
                            onClick={e => e.stopPropagation()}
                            className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td
                        className="px-4 py-3 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400 cursor-pointer"
                        onClick={() => setSelected(s)}
                      >{s.numero}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-32 truncate cursor-pointer" onClick={() => setSelected(s)}>{s.tipoSolicitud?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 cursor-pointer" onClick={() => setSelected(s)}>{s.empleado?.nombreCompleto || '-'}</td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(s)}><PrioridadBadge prioridad={s.prioridad} /></td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(s)}><EstadoBadge estado={s.estado} /></td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(s)}><SLAIndicator porcentaje={s.porcentajeSLA} /></td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 cursor-pointer" onClick={() => setSelected(s)}>{s.tecnico?.nombre || <span className="text-slate-400 italic">Sin asignar</span>}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-pointer" onClick={() => setSelected(s)}>{formatFecha(s.fechaCreacion)}</td>
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

      {/* Barra de acciones masivas */}
      {canBulk && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl">
          <div className="bg-navy-500 dark:bg-navy-600 text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Contador */}
            <div className="flex items-center gap-2 shrink-0">
              <CheckSquare size={16} className="text-orange-400" />
              <span className="text-sm font-semibold tabular-nums">{selectedIds.size}</span>
              <span className="text-sm text-navy-200">{selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}</span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-1 p-1 rounded hover:bg-navy-400 transition-colors"
              >
                <X size={14} className="text-navy-200" />
              </button>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
              {/* Cambiar estado */}
              <div className="flex gap-2 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <Select
                    value={bulkEstado}
                    onChange={setBulkEstado}
                    placeholder="Estado..."
                    options={[
                      { value: '', label: 'Estado...' },
                      ...ESTADOS_BULK.map(e => ({ value: e, label: ESTADOS_LABEL[e] || e })),
                    ]}
                  />
                </div>
                <button
                  onClick={() => ejecutarBulk('cambiar_estado')}
                  disabled={loadingEstado || loadingTecnico || !bulkEstado}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  {loadingEstado && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  Aplicar
                </button>
              </div>

              {/* Asignar técnico — solo admin */}
              {user.rol === 'admin' && tecnicos.length > 0 && (
                <div className="flex gap-2 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <Select
                      value={bulkTecnico}
                      onChange={setBulkTecnico}
                      placeholder="Técnico..."
                      options={[
                        { value: '', label: 'Técnico...' },
                        ...tecnicos.map(t => ({ value: String(t.id), label: t.nombre })),
                      ]}
                    />
                  </div>
                  <button
                    onClick={() => ejecutarBulk('asignar_tecnico')}
                    disabled={loadingTecnico || loadingEstado || !bulkTecnico}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    {loadingTecnico && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    Asignar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
