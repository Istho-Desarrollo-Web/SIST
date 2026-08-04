import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserCog, LogOut, X, ChevronDown, BarChart2, Bell, PlusCircle, RefreshCw, Check, FileText, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { TicketMark } from '../common/CenthrixIcons';
import { dashboardService } from '../../services/dashboardService';
import { formatRelativo } from '../../utils/formatters';
import { ESTADOS_LABEL } from '../../utils/constants';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'tecnico'] },
  { to: '/solicitudes', label: 'Solicitudes', icon: TicketMark, roles: ['admin', 'tecnico', 'usuario'] },
  { to: '/formularios', label: 'Formularios', icon: FileText, roles: ['admin', 'tecnico', 'usuario'] },
  { to: '/empleados', label: 'Empleados', icon: Users, roles: ['admin', 'tecnico'] },
  { to: '/reportes', label: 'Reportes', icon: BarChart2, roles: ['admin', 'tecnico'] },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ['admin'] },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenu, setUserMenu] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState(null);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [hasNew, setHasNew] = useState(true);
  const canBell = user?.rol === 'admin' || user?.rol === 'tecnico';

  const marcarLeida = (id) =>
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));

  const borrarNotif = (id) =>
    setNotifs(prev => prev.filter(n => n.id !== id));

  const marcarTodasLeidas = () =>
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));

  const borrarTodas = () => setNotifs([]);

  const openBell = async () => {
    setBellOpen(v => !v);
    setHasNew(false);
    if (notifs === null && !loadingNotifs) {
      setLoadingNotifs(true);
      try {
        const res = await dashboardService.actividadReciente();
        setNotifs(res.data.data || []);
      } catch { setNotifs([]); }
      finally { setLoadingNotifs(false); }
    }
  };

  const visibleItems = navItems.filter(i => i.roles.includes(user?.rol));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 30 }}>
      <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62, gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, minWidth: 0 }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', textDecoration: 'none', flex: 'none' }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--color-accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <TicketMark size={16} />
            </span>
            <span style={{ lineHeight: 1.1 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, display: 'block', color: 'var(--color-text)' }}>Soporte TI</span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block' }}>ISTHO S.A.S.</span>
            </span>
          </NavLink>

          <div className="cx-scroll" style={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto' }}>
            {visibleItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className="sist-navlink"
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 'var(--radius-md)',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .12s ease',
                  textDecoration: 'none',
                  background: isActive ? 'var(--accent-100)' : 'transparent',
                  color: isActive ? 'var(--accent-800)' : 'var(--color-text-secondary)',
                })}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={14} stroke={isActive ? 'var(--accent-800)' : 'var(--color-text-secondary)'} color={isActive ? 'var(--accent-800)' : 'var(--color-text-secondary)'} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>
          <ThemeToggle />

          {canBell && (
            <div style={{ position: 'relative' }}>
              <button type="button" onClick={openBell} className="cx-btn cx-btn-ghost cx-btn-icon" style={{ position: 'relative' }} title="Notificaciones">
                <Bell size={17} />
                {hasNew && <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)' }} />}
              </button>

              {bellOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setBellOpen(false)} />
                  <div className="cx-card cx-elev-md" style={{ position: 'absolute', right: 0, top: 44, width: 320, maxWidth: '80vw', padding: 0, zIndex: 20, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Actividad reciente</p>
                      {notifs && notifs.length > 0 && <span className="text-muted" style={{ fontSize: 10.5 }}>{notifs.filter(n => !n.leida).length} sin leer</span>}
                    </div>
                    <div className="cx-scroll" style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {loadingNotifs ? (
                        <div className="text-muted" style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12.5 }}>Cargando...</div>
                      ) : !notifs || notifs.length === 0 ? (
                        <div className="text-muted" style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12.5 }}>Sin actividad reciente</div>
                      ) : notifs.map(item => {
                        const esCreacion = item.operacion === 'INSERT';
                        const esCambioEstado = item.campo === 'estado';
                        const iconBg = esCreacion ? 'var(--color-success-subtle-bg)' : 'var(--color-warning-subtle-bg)';
                        const iconColor = esCreacion ? 'var(--color-success-subtle-text)' : 'var(--color-warning-subtle-text)';
                        return (
                          <div key={item.id} style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--color-border)', opacity: item.leida ? .5 : 1 }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: iconBg, display: 'grid', placeItems: 'center', flex: 'none', marginTop: 1 }}>
                              {esCreacion ? <PlusCircle size={11} color={iconColor} /> : <RefreshCw size={11} color={iconColor} />}
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4 }}>
                                <strong>{item.usuario}</strong>
                                {esCreacion
                                  ? <> creó <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{item.solicitudNumero}</span></>
                                  : esCambioEstado
                                    ? <> → <strong>{ESTADOS_LABEL[item.estadoNuevo] || item.estadoNuevo}</strong> en <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{item.solicitudNumero}</span></>
                                    : <> actualizó <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{item.solicitudNumero}</span></>}
                              </p>
                              <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 10.5 }}>{formatRelativo(item.fecha)}</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 'none' }}>
                              <button type="button" onClick={() => marcarLeida(item.id)} disabled={item.leida} title="Marcar como leído" className="cx-btn cx-btn-ghost cx-btn-icon" style={{ padding: 4, color: 'var(--color-success)' }}>
                                <Check size={11} />
                              </button>
                              <button type="button" onClick={() => borrarNotif(item.id)} title="Borrar" className="cx-btn cx-btn-ghost cx-btn-icon" style={{ padding: 4, color: 'var(--color-text-muted)' }}>
                                <X size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ padding: '8px 10px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <NavLink to="/dashboard" onClick={() => setBellOpen(false)} style={{ fontSize: 11.5, color: 'var(--color-accent)', fontWeight: 600, marginRight: 'auto', textDecoration: 'none' }}>
                        Ver todo →
                      </NavLink>
                      <button type="button" onClick={marcarTodasLeidas} className="cx-btn cx-btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}>Marcar leídas</button>
                      <button type="button" onClick={borrarTodas} className="cx-btn cx-btn-danger" style={{ fontSize: 11, padding: '3px 8px' }}>Borrar todas</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {user ? (
            <div style={{ position: 'relative' }}>
              <button type="button" onClick={() => setUserMenu(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: '6px 8px', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text)' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--color-accent)', color: 'white', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>
                  {user.nombre?.[0]?.toUpperCase()}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, maxWidth: 110, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.nombre}</span>
                <ChevronDown size={13} color="var(--color-text-muted)" />
              </button>

              {userMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setUserMenu(false)} />
                  <div className="cx-card cx-elev-md" style={{ position: 'absolute', right: 0, top: 44, width: 180, padding: 6, zIndex: 20 }}>
                    <NavLink to="/perfil" onClick={() => setUserMenu(false)} className="cx-btn cx-btn-ghost cx-btn-block" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}>
                      Mi Perfil
                    </NavLink>
                    <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
                    <button type="button" onClick={handleLogout} className="cx-btn cx-btn-ghost cx-btn-block" style={{ justifyContent: 'flex-start', color: 'var(--color-danger)' }}>
                      <LogOut size={14} />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <NavLink to="/login" className="cx-btn cx-btn-primary" style={{ textDecoration: 'none' }}>
              <LogIn size={15} />
              Iniciar sesión
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}
