import { useState, useEffect } from 'react';
import { Ticket, AlertTriangle, Clock, TrendingUp, Activity, PlusCircle, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { MetricCard } from '../components/dashboard/MetricCard';
import { Card } from '../components/common/Card';
import { Skeleton } from '../components/common/Skeleton';
import { ESTADOS_LABEL } from '../utils/constants';
import { formatRelativo } from '../utils/formatters';
import { toast } from 'sonner';

const CHART_COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#4C8C2B', '#64748B', '#DC2626'];
const PRIORIDAD_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };

export function DashboardPage() {
  const [resumen, setResumen] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [tendencias, setTendencias] = useState(null);
  const [slaMetrics, setSlaMetrics] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.resumen(),
      dashboardService.porTecnico(),
      dashboardService.tendencias(),
      dashboardService.metricasSLA(),
      dashboardService.actividadReciente(),
    ])
      .then(([r, t, tr, sla, act]) => {
        setResumen(r.data.data);
        setTecnicos(t.data.data);
        setTendencias(tr.data.data);
        const raw = sla.data.data || [];
        setSlaMetrics(raw.map(item => ({
          prioridad: PRIORIDAD_LABEL[item.prioridad] || item.prioridad,
          Cumplidos: item.cumplidos,
          Vencidos: (item.total || 0) - (item.cumplidos || 0),
          pct: item.total > 0 ? Math.round((item.cumplidos / item.total) * 100) : 100,
        })));
        setActividad(act.data.data || []);
      })
      .catch(() => toast.error('Error cargando dashboard'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-500 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Resumen del sistema de soporte TI</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 sm:h-28" />)
        ) : (
          <>
            <MetricCard title="Total Tickets" value={resumen?.total} icon={Ticket} color="navy" />
            <MetricCard title="Abiertos" value={resumen?.abiertos} icon={Clock} color="amber" subtitle={`${resumen?.enProceso ?? 0} en proceso`} />
            <MetricCard title="Vencidos" value={resumen?.vencidos} icon={AlertTriangle} color="red" />
            <MetricCard title="Cumpl. SLA" value={`${resumen?.porcentajeCumplimiento ?? 0}%`} icon={TrendingUp} color="green" subtitle={`${resumen?.resueltos ?? 0} resueltos`} />
          </>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Tendencia 30 días */}
        <Card className="p-4 sm:p-5">
          <h3 className="font-semibold text-navy-500 dark:text-white mb-4">Tickets últimos 30 días</h3>
          {loading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={tendencias?.porDia || []}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8531E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E8531E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-navy-600" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={24} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#E8531E" fill="url(#grad)" strokeWidth={2} name="Tickets" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Por estado */}
        <Card className="p-4 sm:p-5">
          <h3 className="font-semibold text-navy-500 dark:text-white mb-4">Distribución por estado</h3>
          {loading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={tendencias?.porEstado || []} dataKey="total" nameKey="estado" cx="50%" cy="50%" outerRadius={60}>
                  {(tendencias?.porEstado || []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val, ESTADOS_LABEL[name] || name]} />
                <Legend formatter={(val) => ESTADOS_LABEL[val] || val} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* SLA por prioridad */}
      <Card className="p-4 sm:p-5">
        <h3 className="font-semibold text-navy-500 dark:text-white mb-1">Cumplimiento SLA por prioridad</h3>
        <p className="text-xs text-slate-400 mb-4">Tickets resueltos dentro del límite vs. vencidos</p>
        {loading ? <Skeleton className="h-44" /> : (
          slaMetrics.length === 0 ? (
            <p className="py-6 text-center text-slate-400 text-sm">Sin datos de SLA aún</p>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={slaMetrics} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-navy-600" />
                  <XAxis dataKey="prioridad" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} width={24} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Cumplidos" fill="#4C8C2B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Vencidos" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {slaMetrics.map(item => (
                  <div key={item.prioridad} className="bg-slate-50 dark:bg-navy-800 rounded-lg p-2.5 text-center">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{item.prioridad}</p>
                    <p className={`text-xl font-bold ${item.pct >= 80 ? 'text-cgreen-600 dark:text-cgreen-400' : item.pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {item.pct}%
                    </p>
                    <p className="text-xs text-slate-400">{item.Cumplidos} / {item.Cumplidos + item.Vencidos}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </Card>

      {/* Técnicos */}
      <Card className="p-4 sm:p-5">
        <h3 className="font-semibold text-navy-500 dark:text-white mb-4">Carga de trabajo por técnico</h3>
        {loading ? <Skeleton className="h-32" /> : (
          <>
            {/* Tarjetas móvil */}
            <div className="sm:hidden space-y-2">
              {tecnicos.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-navy-800 rounded-xl">
                  <div className="min-w-0">
                    <p className="font-medium text-navy-500 dark:text-white text-sm truncate">{t.nombre}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.especialidad || 'Sin especialidad'}</p>
                  </div>
                  <div className="flex gap-4 shrink-0 ml-3 text-center text-xs">
                    <div>
                      <p className="font-bold text-blue-600 dark:text-blue-400 text-base">{t.asignados}</p>
                      <p className="text-slate-400">Asig.</p>
                    </div>
                    <div>
                      <p className="font-bold text-cgreen-600 dark:text-cgreen-400 text-base">{t.resueltos}</p>
                      <p className="text-slate-400">Res.</p>
                    </div>
                    <div>
                      <p className={`font-bold text-base ${t.vencidos > 0 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>{t.vencidos}</p>
                      <p className="text-slate-400">Venc.</p>
                    </div>
                  </div>
                </div>
              ))}
              {tecnicos.length === 0 && (
                <p className="py-4 text-center text-slate-400 text-sm">Sin técnicos registrados</p>
              )}
            </div>

            {/* Tabla escritorio */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-navy-600">
                    <th className="pb-2 pr-4">Técnico</th>
                    <th className="pb-2 pr-4">Especialidad</th>
                    <th className="pb-2 pr-4 text-center">Asignados</th>
                    <th className="pb-2 pr-4 text-center">Resueltos</th>
                    <th className="pb-2 text-center">Vencidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-600">
                  {tecnicos.map(t => (
                    <tr key={t.id}>
                      <td className="py-2.5 pr-4 font-medium text-navy-500 dark:text-white">{t.nombre}</td>
                      <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{t.especialidad || '-'}</td>
                      <td className="py-2.5 pr-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-bold">{t.asignados}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-cgreen-100 text-cgreen-700 dark:bg-cgreen-900/30 dark:text-cgreen-300 rounded-full text-xs font-bold">{t.resueltos}</span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${t.vencidos > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-100 text-slate-500 dark:bg-navy-700 dark:text-slate-400'}`}>{t.vencidos}</span>
                      </td>
                    </tr>
                  ))}
                  {tecnicos.length === 0 && (
                    <tr><td colSpan={5} className="py-4 text-center text-slate-400">Sin técnicos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
      {/* Actividad reciente */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-orange-500" />
          <h3 className="font-semibold text-navy-500 dark:text-white">Actividad reciente</h3>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : actividad.length === 0 ? (
          <p className="py-4 text-center text-slate-400 text-sm">Sin actividad registrada</p>
        ) : (
          <div className="space-y-0 divide-y divide-slate-100 dark:divide-navy-600">
            {actividad.map(item => {
              const esCreacion = item.operacion === 'INSERT';
              const esCambioEstado = item.campo === 'estado';
              return (
                <div key={item.id} className="flex items-start gap-3 py-3">
                  <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${esCreacion ? 'bg-cgreen-100 dark:bg-cgreen-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                    {esCreacion
                      ? <PlusCircle size={13} className="text-cgreen-600 dark:text-cgreen-400" />
                      : <RefreshCw size={13} className="text-orange-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                      <span className="font-semibold text-navy-500 dark:text-white">{item.usuario}</span>
                      {esCreacion
                        ? <> creó el ticket <span className="font-mono text-xs text-orange-600 dark:text-orange-400">{item.solicitudNumero}</span></>
                        : esCambioEstado
                          ? <> cambió estado de <span className="font-mono text-xs text-orange-600 dark:text-orange-400">{item.solicitudNumero}</span> → <span className="font-semibold">{ESTADOS_LABEL[item.estadoNuevo] || item.estadoNuevo}</span></>
                          : <> actualizó <span className="font-mono text-xs text-orange-600 dark:text-orange-400">{item.solicitudNumero}</span></>}
                      {item.empleado && <span className="text-slate-400"> ({item.empleado})</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatRelativo(item.fecha)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
