import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, RefreshCw, X, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { solicitudService } from '../services/solicitudService';
import { usuarioService } from '../services/usuarioService';
import { dashboardService } from '../services/dashboardService';
import { SolicitudModal } from '../components/solicitudes/SolicitudModal';
import { SolicitudForm } from '../components/solicitudes/SolicitudForm';
import { formatFecha } from '../utils/formatters';
import { ESTADOS_LABEL, PRIORIDADES_LABEL, ESTADO_COLORS, PRIORIDAD_COLORS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const ESTADOS_BULK = [
  'abierto', 'en_analisis', 'en_proceso',
  'pendiente_usuario', 'pendiente_externo',
  'resuelto', 'cerrado',
];

function iniciales(nombre) {
  return (nombre || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function SolicitudesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [solicitudes, setSolicitudes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ estado: '', prioridad: '', search: location.state?.search || '' });
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loadingEstado, setLoadingEstado] = useState(false);
  const [loadingTecnico, setLoadingTecnico] = useState(false);
  const searchTimeout = useRef(null);
  const [searchInput, setSearchInput] = useState(filters.search);

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
    dashboardService.resumen().then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user.rol !== 'usuario') {
      usuarioService.listarTecnicos().then(r => setTecnicos(r.data.data));
    }
  }, [user.rol]);

  const onSearchInput = (e) => {
    const v = e.target.value;
    setSearchInput(v);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setFilters(f => ({ ...f, search: v })), 350);
  };

  const canBulk = user.rol !== 'usuario';
  const pageIds = solicitudes.map(s => s.id);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const toggleSelectAll = () => setSelectedIds(allSelected ? new Set() : new Set(pageIds));
  const toggleSelect = (id) => (e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const solStats = stats ? [
    { label: 'Total', value: stats.total, color: 'var(--color-text-secondary)' },
    { label: 'Abiertas', value: stats.abiertos, color: 'var(--color-info)' },
    { label: 'Vencidas', value: stats.vencidos, color: 'var(--color-danger)' },
    { label: 'Resueltas', value: stats.resueltos, color: 'var(--color-success)' },
  ] : [];

  const ejecutarBulkEstado = async (estado) => {
    setLoadingEstado(true);
    try {
      const res = await solicitudService.bulkAction({ ids: Array.from(selectedIds), accion: 'cambiar_estado', valor: estado });
      toast.success(res.data.message);
      cargar(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aplicar la acción');
    } finally {
      setLoadingEstado(false);
    }
  };

  const ejecutarBulkTecnico = async (tecnicoId) => {
    setLoadingTecnico(true);
    try {
      const res = await solicitudService.bulkAction({ ids: Array.from(selectedIds), accion: 'asignar_tecnico', valor: tecnicoId });
      toast.success(res.data.message);
      cargar(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aplicar la acción');
    } finally {
      setLoadingTecnico(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Ticket size={21} />
          </span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 23, margin: '0 0 2px', letterSpacing: '-0.01em' }}>Solicitudes</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Gestión de tickets de soporte</p>
          </div>
        </div>
        <button type="button" className="cx-btn cx-btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} />
          Nueva Solicitud
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 16 }}>
        {(stats ? solStats : Array.from({ length: 4 })).map((st, i) => (
          <div key={st?.label ?? i} className="cx-card cx-elev-sm" style={{ padding: '14px 16px' }}>
            <p className="text-muted" style={{ margin: '0 0 4px', fontSize: 10.5, fontWeight: 700, letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>{st?.label ?? ''}</p>
            {st ? <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: st.color }}>{st.value}</p> : <div className="cx-skeleton" style={{ height: 22, width: '40%' }} />}
          </div>
        ))}
      </div>

      <div className="cx-card cx-elev-sm" style={{ padding: 16, marginBottom: 16 }}>
        <input className="cx-input" placeholder="Buscar por número o empleado..." value={searchInput} onChange={onSearchInput} style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }} />
        <p className="text-muted" style={{ margin: '0 0 6px', fontSize: 10.5, fontWeight: 700, letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>Estado</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className={`cx-btn ${!filters.estado ? 'cx-btn-primary' : 'cx-btn-secondary'}`} style={{ fontSize: 12, padding: '5px 11px' }} onClick={() => setFilters(f => ({ ...f, estado: '' }))}>Todos</button>
          {Object.entries(ESTADOS_LABEL).map(([v, l]) => (
            <button key={v} type="button" className={`cx-btn ${filters.estado === v ? 'cx-btn-primary' : 'cx-btn-secondary'}`} style={{ fontSize: 12, padding: '5px 11px' }} onClick={() => setFilters(f => ({ ...f, estado: v }))}>{l}</button>
          ))}
        </div>
        <p className="text-muted" style={{ margin: '0 0 6px', fontSize: 10.5, fontWeight: 700, letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>Prioridad</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className={`cx-btn ${!filters.prioridad ? 'cx-btn-primary' : 'cx-btn-secondary'}`} style={{ fontSize: 12, padding: '5px 11px' }} onClick={() => setFilters(f => ({ ...f, prioridad: '' }))}>Todas</button>
          {Object.entries(PRIORIDADES_LABEL).map(([v, l]) => (
            <button key={v} type="button" className={`cx-btn ${filters.prioridad === v ? 'cx-btn-primary' : 'cx-btn-secondary'}`} style={{ fontSize: 12, padding: '5px 11px' }} onClick={() => setFilters(f => ({ ...f, prioridad: v }))}>{l}</button>
          ))}
          <button type="button" className="cx-btn cx-btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => cargar(pagination.page)} title="Actualizar"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="cx-card cx-elev-sm" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <table className="cx-table">
              <thead><tr><th>Número</th><th>Tipo</th><th>Empleado</th><th>Prioridad</th><th>Estado</th><th>SLA</th><th>Técnico</th><th>Fecha</th></tr></thead>
              <tbody>
                {[0, 1, 2, 3, 4].map(i => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => <td key={j}><div className="cx-skeleton" style={{ height: 12, width: '70%' }} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="cx-empty" style={{ border: 'none', padding: '44px 24px' }}>
            <div className="cx-empty-icon"><Ticket size={24} /></div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '6px 0 0' }}>No hay solicitudes</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cx-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  {canBulk && <th style={{ width: 30 }}><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th>}
                  <th>Número</th><th>Tipo</th><th>Empleado</th><th>Prioridad</th><th>Estado</th><th>SLA</th><th>Técnico</th><th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map(s => (
                  <tr key={s.id} style={{ background: selectedIds.has(s.id) ? 'var(--accent-100)' : 'transparent', cursor: 'pointer' }} onClick={() => setSelected(s)}>
                    {canBulk && <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(s.id)} onChange={toggleSelect(s.id)} /></td>}
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-accent)' }}>{s.numero}</td>
                    <td className="text-muted" style={{ textTransform: 'capitalize' }}>{s.tipoSolicitud?.replace(/_/g, ' ')}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flex: 'none' }}>{iniciales(s.empleado?.nombreCompleto)}</span>
                        {s.empleado?.nombreCompleto || '-'}
                      </div>
                    </td>
                    <td><span className={`cx-tag ${PRIORIDAD_COLORS[s.prioridad]}`}>{PRIORIDADES_LABEL[s.prioridad]}</span></td>
                    <td><span className={`cx-tag ${ESTADO_COLORS[s.estado]}`}>{ESTADOS_LABEL[s.estado]}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 90 }}>
                        <div style={{ flex: 1, background: 'var(--color-border)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(s.porcentajeSLA, 100)}%`, background: s.porcentajeSLA <= 75 ? 'var(--color-success)' : s.porcentajeSLA <= 100 ? 'var(--color-warning)' : 'var(--color-danger)' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: s.porcentajeSLA <= 75 ? 'var(--color-success)' : s.porcentajeSLA <= 100 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{s.porcentajeSLA}%</span>
                      </div>
                    </td>
                    <td className="text-muted">{s.tecnico?.nombre || 'Sin asignar'}</td>
                    <td className="text-muted" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatFecha(s.fechaCreacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 16 }}>
          <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" disabled={pagination.page <= 1} onClick={() => cargar(pagination.page - 1)}>‹</button>
          <span className="text-muted" style={{ fontSize: 12 }}>Página {pagination.page} de {pagination.totalPages}</span>
          <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" disabled={pagination.page >= pagination.totalPages} onClick={() => cargar(pagination.page + 1)}>›</button>
        </div>
      </div>

      {canBulk && selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 40, width: 'calc(100% - 40px)', maxWidth: 640 }}>
          <div className="cx-card cx-elev-md" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 13 }}>{selectedIds.size}</strong>
              <span className="text-muted" style={{ fontSize: 13 }}>seleccionadas</span>
              <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" style={{ marginLeft: 'auto', width: 26, height: 26, padding: 0 }} onClick={() => setSelectedIds(new Set())}><X size={13} /></button>
            </div>
            <div>
              <p className="text-muted" style={{ margin: '0 0 6px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)' }}>Cambiar estado a</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ESTADOS_BULK.map(v => (
                  <button key={v} type="button" className="cx-btn cx-btn-secondary" disabled={loadingEstado} style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => ejecutarBulkEstado(v)}>{ESTADOS_LABEL[v]}</button>
                ))}
              </div>
            </div>
            {user.rol === 'admin' && tecnicos.length > 0 && (
              <div>
                <p className="text-muted" style={{ margin: '0 0 6px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)' }}>Asignar técnico</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tecnicos.map(t => (
                    <button key={t.id} type="button" className="cx-btn cx-btn-secondary" disabled={loadingTecnico} style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => ejecutarBulkTecnico(t.id)}>{t.nombre}</button>
                  ))}
                </div>
              </div>
            )}
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
