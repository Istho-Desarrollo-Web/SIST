import { useState, useEffect } from 'react';
import { Ticket, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { MetricCard } from '../components/dashboard/MetricCard';
import { Card } from '../components/common/Card';
import { Skeleton } from '../components/common/Skeleton';
import { ESTADOS_LABEL } from '../utils/constants';
import { toast } from 'sonner';

const CHART_COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#4C8C2B', '#64748B', '#DC2626'];

export function DashboardPage() {
  const [resumen, setResumen] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [tendencias, setTendencias] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.resumen(),
      dashboardService.porTecnico(),
      dashboardService.tendencias(),
    ])
      .then(([r, t, tr]) => {
        setResumen(r.data.data);
        setTecnicos(t.data.data);
        setTendencias(tr.data.data);
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
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
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tendencia 30 días */}
        <Card className="p-5">
          <h3 className="font-semibold text-navy-500 dark:text-white mb-4">Tickets últimos 30 días</h3>
          {loading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={tendencias?.porDia || []}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8531E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E8531E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-navy-600" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#E8531E" fill="url(#grad)" strokeWidth={2} name="Tickets" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Por estado */}
        <Card className="p-5">
          <h3 className="font-semibold text-navy-500 dark:text-white mb-4">Distribución por estado</h3>
          {loading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={tendencias?.porEstado || []} dataKey="total" nameKey="estado" cx="50%" cy="50%" outerRadius={70}>
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

      {/* Tabla técnicos */}
      <Card className="p-5">
        <h3 className="font-semibold text-navy-500 dark:text-white mb-4">Carga de trabajo por técnico</h3>
        {loading ? <Skeleton className="h-32" /> : (
          <div className="overflow-x-auto">
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
        )}
      </Card>
    </div>
  );
}
