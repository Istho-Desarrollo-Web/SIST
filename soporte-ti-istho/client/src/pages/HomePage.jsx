import { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Clock, BarChart2, Shield, ArrowRight, LayoutDashboard, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formulariosApi } from '../services/formulariosApi';
import { TicketMark } from '../components/common/CenthrixIcons';

const FEATURES = [
  { icon: Ticket, title: 'Gestión de Tickets', desc: 'Crea y da seguimiento a solicitudes de soporte con numeración automática.', bg: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)' },
  { icon: Clock, title: 'SLA Automatizado', desc: 'Cálculo preciso con horario laboral ISTHO y festivos Colombia.', bg: 'var(--color-info-subtle-bg)', color: 'var(--color-info-subtle-text)' },
  { icon: BarChart2, title: 'Dashboard en Tiempo Real', desc: 'KPIs, carga de técnicos y cumplimiento SLA en una sola vista.', bg: 'var(--color-warning-subtle-bg)', color: 'var(--color-warning-subtle-text)' },
  { icon: Shield, title: 'Trazabilidad ISO 9001', desc: 'Auditoría completa de todos los cambios del sistema.', bg: 'var(--color-success-subtle-bg)', color: 'var(--color-success-subtle-text)' },
];

const STATS = [
  { value: '1.204', label: 'tickets resueltos' },
  { value: '86%', label: 'cumplimiento SLA' },
  { value: '12', label: 'técnicos activos' },
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
  const dashboardSubtitle = isAuthenticated ? `Bienvenido, ${user.nombre?.split(' ')[0]}` : 'Iniciar sesión como técnico o admin';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(231,76,60,.22) 0%, rgba(231,76,60,.08) 40%, rgba(231,76,60,0) 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,8vw,88px) 20px 56px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <div style={{ width: 76, height: 76, borderRadius: 'var(--radius-xl)', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-lg)', marginBottom: 22 }}>
            <TicketMark size={38} />
          </div>
          <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', margin: '0 0 12px' }}>
            Soporte TI <span style={{ color: 'var(--color-accent)' }}>ISTHO</span>
          </h1>
          <p className="text-muted" style={{ fontSize: 16, maxWidth: 520, margin: '0 0 28px', textWrap: 'pretty' }}>
            Sistema Integral de Solicitudes para Soporte Tecnológico — Centro Logístico Industrial del Norte
          </p>

          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 36 }}>
            {STATS.map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 && <div style={{ width: 1, height: 36, background: 'var(--color-border)', alignSelf: 'center' }} />}
                <div>
                  <p style={{ margin: 0, fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>{s.value}</p>
                  <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 11.5 }}>{s.label}</p>
                </div>
              </Fragment>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', width: '100%', justifyContent: 'center', marginBottom: formularios.length > 0 ? 40 : 0 }}>
            <Link
              to="/solicitud"
              className="cx-card cx-elev-sm sist-hero-card"
              style={{ flex: 1, minWidth: 230, maxWidth: 280, textAlign: 'left', cursor: 'pointer', background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'white', padding: 22, transition: 'transform .15s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center' }}>
                  <TicketMark size={19} />
                </span>
                <ArrowRight size={17} style={{ opacity: .7 }} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 17, margin: '0 0 4px' }}>Tengo un problema</p>
              <p style={{ margin: 0, fontSize: 13, opacity: .85 }}>Reportar una solicitud de soporte TI</p>
            </Link>

            <Link
              to={dashboardTo}
              className="cx-card cx-elev-sm sist-hero-card"
              style={{ flex: 1, minWidth: 230, maxWidth: 280, textAlign: 'left', cursor: 'pointer', padding: 22, transition: 'transform .15s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--color-surface)', display: 'grid', placeItems: 'center' }}>
                  <LayoutDashboard size={19} color="var(--color-text)" />
                </span>
                <ArrowRight size={17} color="var(--color-text-muted)" />
              </div>
              <p style={{ fontWeight: 700, fontSize: 17, margin: '0 0 4px' }}>{dashboardLabel}</p>
              <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{dashboardSubtitle}</p>
            </Link>
          </div>

          {formularios.length > 0 && (
            <div style={{ width: '100%', maxWidth: 560, textAlign: 'left' }}>
              <p className="text-muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', margin: '0 0 10px' }}>
                Formularios disponibles
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {formularios.map((f) => (
                  <Link
                    key={f.id}
                    to={`/formularios/${f.id}/responder`}
                    className="cx-card sist-navlink"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', transition: 'background .12s ease' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--color-accent-subtle-bg)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                        <FileText size={14} color="var(--color-accent-subtle-text)" />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nombre}</p>
                        <p className="text-muted" style={{ margin: '1px 0 0', fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.descripcion}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
                      <span className={`cx-tag ${f.acceso === 'publico' ? 'cx-tag-success' : 'cx-tag-outline'}`} style={{ padding: '2px 8px' }}>
                        {f.acceso === 'publico' ? 'Público' : 'Privado'}
                      </span>
                      <ChevronRight size={15} color="var(--color-text-muted)" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '48px 20px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 28 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: f.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: 12 }}>
                <f.icon size={22} />
              </div>
              <h3 style={{ fontSize: 14.5, margin: '0 0 4px' }}>{f.title}</h3>
              <p className="text-muted" style={{ fontSize: 12.5, margin: 0, textWrap: 'pretty' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="text-muted" style={{ textAlign: 'center', fontSize: 11.5, padding: 20 }}>Sistema Integral de Solicitudes v1.0 — ISTHO S.A.S. © 2026</p>
    </div>
  );
}
