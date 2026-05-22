import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Clock, BarChart2, Shield, ArrowRight, LayoutDashboard, FileText, ChevronRight, Lock, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formulariosApi } from '../services/formulariosApi';

const features = [
  { icon: Ticket, title: 'Gestión de Tickets', desc: 'Crea y da seguimiento a solicitudes de soporte con numeración automática.' },
  { icon: Clock, title: 'SLA Automatizado', desc: 'Cálculo preciso con horario laboral ISTHO y festivos Colombia.' },
  { icon: BarChart2, title: 'Dashboard en Tiempo Real', desc: 'KPIs, carga de técnicos y cumplimiento SLA en una sola vista.' },
  { icon: Shield, title: 'Trazabilidad ISO 9001', desc: 'Auditoría completa de todos los cambios del sistema.' },
];

export function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [formularios, setFormularios] = useState([]);

  useEffect(() => {
    formulariosApi.listarDisponibles()
      .then((res) => setFormularios(res.data.data || []))
      .catch(() => {});
  }, []);

  const dashboardTo = isAuthenticated
    ? (user.rol === 'usuario' ? '/solicitudes' : '/dashboard')
    : '/login';

  const dashboardLabel = isAuthenticated ? 'Ir al Dashboard' : 'Acceso Equipo TI';

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-700 to-navy-500 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl p-3">
          <img src="/logo-blanco.png" alt="ISTHO" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Soporte TI <span className="text-orange-400">ISTHO</span>
        </h1>
        <p className="text-navy-200 text-lg max-w-xl mb-10">
          Sistema Integral de Solicitudes para Soporte Tecnológico — Centro Logístico Industrial del Norte
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          <Link
            to="/solicitud"
            className="flex-1 group bg-orange-500 hover:bg-orange-600 text-white rounded-2xl p-6 text-left transition-all shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Ticket size={20} />
              </div>
              <ArrowRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="font-bold text-lg leading-tight">Tengo un problema</p>
            <p className="text-orange-100 text-sm mt-1">Reportar una solicitud de soporte TI</p>
          </Link>

          <Link
            to={dashboardTo}
            className="flex-1 group bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/40 text-white rounded-2xl p-6 text-left transition-all backdrop-blur-sm hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <LayoutDashboard size={20} />
              </div>
              <ArrowRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="font-bold text-lg leading-tight">{dashboardLabel}</p>
            <p className="text-navy-200 text-sm mt-1">
              {isAuthenticated ? `Bienvenido, ${user.nombre?.split(' ')[0]}` : 'Iniciar sesión como técnico o admin'}
            </p>
          </Link>
        </div>

        {/* Formularios disponibles */}
        {formularios.length > 0 && (
          <div className="w-full max-w-lg mt-8">
            <p className="text-navy-300 text-xs uppercase font-semibold tracking-wider mb-3 text-left">
              Formularios disponibles
            </p>
            <div className="flex flex-col gap-2">
              {formularios.map((f) => (
                <Link
                  key={f.id}
                  to={`/formularios/${f.id}/responder`}
                  className="group flex items-center justify-between px-4 py-3 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 hover:border-white/30 text-white transition-all backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={15} className="text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{f.nombre}</p>
                      {f.descripcion && (
                        <p className="text-xs text-navy-300 truncate">{f.descripcion}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {f.acceso === 'publico'
                      ? <Globe size={13} className="text-cgreen-400" />
                      : <Lock size={13} className="text-orange-400" />}
                    <ChevronRight size={15} className="text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="bg-white/5 backdrop-blur-sm py-12 px-4">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <div key={f.title} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500/20 rounded-xl mb-3">
                <f.icon size={22} className="text-orange-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-navy-200 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-4 text-navy-300 text-xs">
        Sistema Integral de Solicitudes v1.0 — ISTHO S.A.S. © 2026
      </div>
    </div>
  );
}
