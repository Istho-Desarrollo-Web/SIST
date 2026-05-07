import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Ticket, Users, UserCog, LogOut, Menu, X, ChevronDown, BarChart2, Bell, PlusCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LogoSIST } from '../common/LogoSIST';
import { dashboardService } from '../../services/dashboardService';
import { formatRelativo } from '../../utils/formatters';
import { ESTADOS_LABEL } from '../../utils/constants';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'tecnico'] },
  { to: '/solicitudes', label: 'Solicitudes', icon: Ticket, roles: ['admin', 'tecnico', 'usuario'] },
  { to: '/empleados', label: 'Empleados', icon: Users, roles: ['admin', 'tecnico'] },
  { to: '/reportes', label: 'Reportes', icon: BarChart2, roles: ['admin', 'tecnico'] },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ['admin'] },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState(null);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [hasNew, setHasNew] = useState(true);
  const canBell = user?.rol === 'admin' || user?.rol === 'tecnico';

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
    navigate('/login');
  };

  return (
    <nav className="bg-navy-500 dark:bg-navy-900 border-b border-navy-600 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/">
            <LogoSIST size={34} textClass="hidden sm:block" />
          </NavLink>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {visibleItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-white/15 text-white'
                    : 'text-navy-100 hover:bg-white/10 hover:text-white'}`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Notification bell */}
            {canBell && (
              <div className="relative">
                <button
                  onClick={openBell}
                  className="relative p-2 rounded-lg hover:bg-white/10 text-navy-100 hover:text-white transition-colors"
                  aria-label="Notificaciones"
                >
                  <Bell size={18} />
                  {hasNew && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
                  )}
                </button>

                {bellOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
                    <div className="absolute right-0 mt-1 w-80 bg-white dark:bg-navy-700 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 z-20">
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-navy-600">
                        <p className="text-sm font-semibold text-navy-500 dark:text-white">Actividad reciente</p>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-navy-600">
                        {loadingNotifs ? (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">Cargando...</div>
                        ) : !notifs || notifs.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">Sin actividad reciente</div>
                        ) : notifs.map(item => {
                          const esCreacion = item.operacion === 'INSERT';
                          const esCambioEstado = item.campo === 'estado';
                          return (
                            <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-navy-600 transition-colors">
                              <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${esCreacion ? 'bg-cgreen-100 dark:bg-cgreen-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                                {esCreacion
                                  ? <PlusCircle size={11} className="text-cgreen-600 dark:text-cgreen-400" />
                                  : <RefreshCw size={11} className="text-orange-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                                  <span className="font-semibold">{item.usuario}</span>
                                  {esCreacion
                                    ? <> creó <span className="font-mono text-orange-600 dark:text-orange-400">{item.solicitudNumero}</span></>
                                    : esCambioEstado
                                      ? <> → <span className="font-semibold">{ESTADOS_LABEL[item.estadoNuevo] || item.estadoNuevo}</span> en <span className="font-mono text-orange-600 dark:text-orange-400">{item.solicitudNumero}</span></>
                                      : <> actualizó <span className="font-mono text-orange-600 dark:text-orange-400">{item.solicitudNumero}</span></>}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">{formatRelativo(item.fecha)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-4 py-2.5 border-t border-slate-200 dark:border-navy-600">
                        <NavLink
                          to="/dashboard"
                          onClick={() => setBellOpen(false)}
                          className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                        >
                          Ver todo en Dashboard →
                        </NavLink>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{user?.nombre?.[0]?.toUpperCase()}</span>
                </div>
                <span className="hidden sm:block text-sm text-white font-medium max-w-28 truncate">{user?.nombre}</span>
                <ChevronDown size={14} className="text-navy-200" />
              </button>

              {userMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-navy-700 rounded-xl shadow-lg border border-slate-200 dark:border-navy-600 z-20 py-1">
                    <NavLink
                      to="/perfil"
                      onClick={() => setUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-600"
                    >
                      Mi Perfil
                    </NavLink>
                    <hr className="my-1 border-slate-200 dark:border-navy-600" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut size={14} />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(v => !v)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-3 space-y-1">
            {visibleItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? 'bg-white/15 text-white' : 'text-navy-100 hover:bg-white/10 hover:text-white'}`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
