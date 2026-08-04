import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { LayoutDashboard, Activity, PlusCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { ESTADOS_LABEL } from '../utils/constants';
import { formatRelativo } from '../utils/formatters';

const ESTADO_COLOR = {
  abierto: 'var(--color-info)',
  en_analisis: 'var(--color-info)',
  en_proceso: 'var(--color-warning)',
  pendiente_usuario: 'var(--neutral-500)',
  pendiente_externo: 'var(--neutral-500)',
  resuelto: 'var(--color-success)',
  cerrado: 'var(--neutral-400)',
  rechazado: 'var(--color-danger)',
};
const PRIORIDAD_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };
const DONUT_C = 2 * Math.PI * 50;

function SkeletonRow() {
  return <div className="cx-skeleton" style={{ height: 12, width: '75%' }} />;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [tendencias, setTendencias] = useState(null);
  const [slaMetrics, setSlaMetrics] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [actividadPage, setActividadPage] = useState(1);
  const [actividadPagination, setActividadPagination] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [estadoActivo, setEstadoActivo] = useState(null);
  const [kpiAbierto, setKpiAbierto] = useState(null);

  useEffect(() => {
    Promise.all([
      dashboardService.resumen(),
      dashboardService.porTecnico(),
      dashboardService.tendencias(),
      dashboardService.metricasSLA(),
      dashboardService.actividadReciente({ page: 1, limit: 5 }),
    ])
      .then(([r, t, tr, sla, act]) => {
        setResumen(r.data.data);
        setTecnicos(t.data.data);
        setTendencias(tr.data.data);
        const raw = sla.data.data || [];
        setSlaMetrics(raw.map(item => ({
          prioridad: PRIORIDAD_LABEL[item.prioridad] || item.prioridad,
          cumplidos: item.cumplidos || 0,
          total: item.total || 0,
          pct: item.total > 0 ? Math.round((item.cumplidos / item.total) * 100) : 100,
        })));
        setActividad(act.data.data || []);
        setActividadPagination(act.data.pagination || { totalPages: 1 });
      })
      .catch(() => toast.error('Error cargando dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const cargarActividad = useCallback(async (page) => {
    try {
      const res = await dashboardService.actividadReciente({ page, limit: 5 });
      setActividad(res.data.data || []);
      setActividadPagination(res.data.pagination || { totalPages: 1 });
      setActividadPage(page);
    } catch {
      toast.error('Error cargando actividad');
    }
  }, []);

  const dias = (tendencias?.porDia || []).slice(-7);
  const maxDia = Math.max(1, ...dias.map(d => d.total));

  const estados = (tendencias?.porEstado || []).filter(e => e.total > 0);

  const ESTADOS_ABIERTOS = ['abierto', 'en_analisis', 'en_proceso', 'pendiente_usuario', 'pendiente_externo'];
  const breakdownEstados = estados.map(e => ({ label: ESTADOS_LABEL[e.estado] || e.estado, value: e.total }));
  const breakdownAbiertos = estados.filter(e => ESTADOS_ABIERTOS.includes(e.estado)).map(e => ({ label: ESTADOS_LABEL[e.estado] || e.estado, value: e.total }));
  const totalAbiertos = breakdownAbiertos.reduce((sum, b) => sum + b.value, 0);

  const kpis = [
    { key: 'total', label: 'Total Tickets', value: resumen?.total ?? '-', meta: null, breakdown: breakdownEstados },
    { key: 'abiertas', label: 'Solicitudes activas', value: tendencias ? totalAbiertos : '-', meta: `${resumen?.enProceso ?? 0} en proceso`, breakdown: breakdownAbiertos },
    { key: 'vencidos', label: 'Vencidos', value: resumen?.vencidos ?? '-', meta: null, breakdown: null },
    { key: 'sla', label: 'Cumplimiento SLA', value: resumen ? `${resumen.porcentajeCumplimiento ?? 0}%` : '-', meta: `${resumen?.resueltos ?? 0} resueltos`, breakdown: null },
  ];

  const donutTotal = estados.reduce((a, e) => a + e.total, 0);
  const donutSegments = estados.reduce((acc, e) => {
    const pct = donutTotal > 0 ? Math.round((e.total / donutTotal) * 100) : 0;
    const arcLen = donutTotal > 0 ? (e.total / donutTotal) * DONUT_C : 0;
    const accLen = acc.length ? acc[acc.length - 1].accLen + acc[acc.length - 1].arcLen : 0;
    acc.push({ ...e, pct, arcLen, accLen, dasharray: `${arcLen.toFixed(2)} ${DONUT_C}`, dashoffset: -accLen, color: ESTADO_COLOR[e.estado] || 'var(--neutral-500)' });
    return acc;
  }, []);
  const activeEstado = estados.find(e => e.estado === estadoActivo);
  const donutCenterValue = activeEstado ? activeEstado.total : donutTotal;
  const donutCenterLabel = activeEstado ? (ESTADOS_LABEL[activeEstado.estado] || activeEstado.estado) : 'tickets';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <LayoutDashboard size={21} />
        </span>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 23, margin: '0 0 2px', letterSpacing: '-0.01em' }}>Dashboard</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Resumen del sistema de soporte TI</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginBottom: 20 }}>
        {kpis.map(k => {
          const expandible = !!k.breakdown && k.breakdown.length > 0;
          const abierto = kpiAbierto === k.key;
          return (
            <div
              key={k.key}
              className="cx-card cx-elev-sm"
              style={{ padding: 18, cursor: expandible ? 'pointer' : 'default' }}
              onClick={expandible ? () => setKpiAbierto(abierto ? null : k.key) : undefined}
            >
              <p className="cx-card-kicker" style={{ margin: 0 }}>{k.label}</p>
              {loading ? <div className="cx-skeleton" style={{ height: 26, width: '50%', marginTop: 6 }} /> : <p className="cx-card-kpi-value">{k.value}</p>}
              {k.meta && !loading && <p className="cx-card-meta">{k.meta}</p>}
              {expandible && abierto && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {k.breakdown.map(b => (
                    <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                      <span className="text-muted">{b.label}</span>
                      <strong>{b.value}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16, marginBottom: 16 }}>
        <div className="cx-card cx-elev-sm" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14.5, margin: '0 0 16px' }}>Tickets últimos 7 días</h3>
          {loading ? <div className="cx-skeleton" style={{ height: 120 }} /> : dias.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', fontSize: 13, padding: '30px 0' }}>Sin datos de tendencia</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
              {dias.map((d, i) => (
                <div key={d.fecha} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                  <span className="text-muted" style={{ fontSize: 10.5 }}>{d.total}</span>
                  <div
                    title={`${d.fecha}: ${d.total} tickets`}
                    style={{
                      width: '100%', maxWidth: 28, borderRadius: '4px 4px 0 0', background: 'var(--color-accent)', opacity: .85,
                      transformOrigin: 'bottom', height: Math.round((d.total / maxDia) * 88),
                      animation: `barGrow .5s ease-out ${(i * 0.06).toFixed(2)}s both`,
                    }}
                  />
                  <span className="text-muted" style={{ fontSize: 10.5 }}>{format(parseISO(d.fecha), 'EEE', { locale: es })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cx-card cx-elev-sm" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14.5, margin: '0 0 16px' }}>Distribución por estado</h3>
          {loading ? <div className="cx-skeleton" style={{ height: 120 }} /> : donutTotal === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', fontSize: 13, padding: '30px 0' }}>Sin solicitudes registradas</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 120, height: 120, flex: 'none' }}>
                <svg viewBox="0 0 120 120" width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={60} cy={60} r={50} fill="none" stroke="var(--color-border)" strokeWidth={16} opacity={.25} />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.estado} cx={60} cy={60} r={50} fill="none" stroke={seg.color}
                      strokeWidth={estadoActivo === seg.estado ? 20 : 16}
                      opacity={!estadoActivo || estadoActivo === seg.estado ? 1 : 0.3}
                      strokeLinecap="butt"
                      strokeDasharray={seg.dasharray} strokeDashoffset={seg.dashoffset}
                      style={{ cursor: 'pointer', transition: 'stroke-width .15s ease,opacity .15s ease' }}
                      onClick={() => setEstadoActivo(a => a === seg.estado ? null : seg.estado)}
                    >
                      <title>{`${ESTADOS_LABEL[seg.estado] || seg.estado}: ${seg.total} (${seg.pct}%)`}</title>
                    </circle>
                  ))}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{donutCenterValue}</span>
                  <span className="text-muted" style={{ fontSize: 10, textTransform: 'capitalize' }}>{donutCenterLabel}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 140 }}>
                {estados.map(e => (
                  <div
                    key={e.estado}
                    onClick={() => setEstadoActivo(a => a === e.estado ? null : e.estado)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 6px', cursor: 'pointer', borderRadius: 6, background: estadoActivo === e.estado ? `color-mix(in srgb, ${ESTADO_COLOR[e.estado] || 'var(--neutral-500)'} 14%, transparent)` : 'transparent' }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: ESTADO_COLOR[e.estado] || 'var(--neutral-500)', flex: 'none' }} />
                    <span style={{ flex: 1 }}>{ESTADOS_LABEL[e.estado] || e.estado}</span>
                    <span style={{ fontWeight: 700 }}>{e.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="cx-card cx-elev-sm" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14.5, margin: '0 0 2px' }}>Cumplimiento SLA por prioridad</h3>
        <p className="text-muted" style={{ margin: '0 0 16px', fontSize: 12 }}>Tickets resueltos dentro del límite vs. vencidos</p>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
            {[0, 1, 2, 3].map(i => <div key={i} className="cx-skeleton" style={{ height: 70 }} />)}
          </div>
        ) : slaMetrics.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', fontSize: 13, padding: '20px 0' }}>Sin datos de SLA aún</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
            {slaMetrics.map(m => {
              const pctColor = m.pct >= 80 ? 'var(--color-success)' : m.pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
              return (
                <div key={m.prioridad} title={`${m.cumplidos} de ${m.total} tickets ${m.prioridad} dentro del SLA`} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center', cursor: 'pointer' }}>
                  <p className="text-muted" style={{ margin: '0 0 4px', fontSize: 10.5, fontWeight: 700, letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>{m.prioridad}</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: pctColor }}>{m.pct}%</p>
                  <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 11 }}>{m.cumplidos} / {m.total}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="cx-card cx-elev-sm" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14.5, margin: '0 0 14px' }}>Carga de trabajo por técnico</h3>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[0, 1, 2].map(i => <SkeletonRow key={i} />)}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cx-table" style={{ minWidth: 480 }}>
              <thead><tr><th>Técnico</th><th>Especialidad</th><th style={{ textAlign: 'center' }}>Asignados</th><th style={{ textAlign: 'center' }}>Resueltos</th><th style={{ textAlign: 'center' }}>Vencidos</th></tr></thead>
              <tbody>
                {tecnicos.map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} title={`Ver solicitudes de ${t.nombre}`} onClick={() => navigate('/solicitudes', { state: { search: t.nombre } })}>
                    <td style={{ fontWeight: 600 }}>{t.nombre}</td>
                    <td className="text-muted">{t.especialidad || '-'}</td>
                    <td style={{ textAlign: 'center' }}><span className="cx-tag cx-tag-info">{t.asignados}</span></td>
                    <td style={{ textAlign: 'center' }}><span className="cx-tag cx-tag-success">{t.resueltos}</span></td>
                    <td style={{ textAlign: 'center' }}><span className={`cx-tag ${t.vencidos > 0 ? 'cx-tag-danger' : 'cx-tag-neutral'}`}>{t.vencidos}</span></td>
                  </tr>
                ))}
                {tecnicos.length === 0 && <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center', padding: 16 }}>Sin técnicos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cx-card cx-elev-sm" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Activity size={16} color="var(--color-accent)" />
          <h3 style={{ fontSize: 14.5, margin: 0 }}>Actividad reciente</h3>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[0, 1, 2, 3, 4].map(i => <div key={i} className="cx-skeleton" style={{ height: 40 }} />)}</div>
        ) : actividad.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', fontSize: 13, padding: '20px 0' }}>Sin actividad registrada</p>
        ) : (
          <>
            <div>
              {actividad.map(item => {
                const esCreacion = item.operacion === 'INSERT';
                const esCambioEstado = item.campo === 'estado';
                const iconBg = esCreacion ? 'var(--color-success-subtle-bg)' : 'var(--color-warning-subtle-bg)';
                const iconColor = esCreacion ? 'var(--color-success-subtle-text)' : 'var(--color-warning-subtle-text)';
                return (
                  <div
                    key={item.id}
                    style={{ display: 'flex', gap: 12, padding: '12px 10px', margin: '0 -10px', borderBottom: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}
                    onClick={() => navigate('/solicitudes', { state: { search: item.solicitudNumero } })}
                  >
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: iconBg, display: 'grid', placeItems: 'center', flex: 'none', marginTop: 1 }}>
                      {esCreacion ? <PlusCircle size={13} color={iconColor} /> : <RefreshCw size={13} color={iconColor} />}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>
                        <strong>{item.usuario}</strong>
                        {esCreacion
                          ? <> creó el ticket <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{item.solicitudNumero}</span></>
                          : esCambioEstado
                            ? <> cambió estado de <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{item.solicitudNumero}</span> → <strong>{ESTADOS_LABEL[item.estadoNuevo] || item.estadoNuevo}</strong></>
                            : <> actualizó <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{item.solicitudNumero}</span></>}
                        {item.empleado && <span className="text-muted"> ({item.empleado})</span>}
                      </p>
                      <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 11.5 }}>{formatRelativo(item.fecha)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14, alignItems: 'center' }}>
              <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" disabled={actividadPage <= 1} onClick={() => cargarActividad(actividadPage - 1)}><ChevronLeft size={14} /></button>
              <span className="text-muted" style={{ fontSize: 12 }}>Página {actividadPage} de {actividadPagination.totalPages}</span>
              <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" disabled={actividadPage >= actividadPagination.totalPages} onClick={() => cargarActividad(actividadPage + 1)}><ChevronRight size={14} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
