import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Ticket, Users, UserCog, LogOut, Menu, X, ChevronDown, BarChart2, Bell, PlusCircle, RefreshCw, Check, FileText, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LogoSIST } from '../common/LogoSIST';
import { dashboardService } from '../../services/dashboardService';
import { formatRelativo } from '../../utils/formatters';
import { ESTADOS_LABEL } from '../../utils/constants';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'tecnico'] },
  { to: '/solicitudes', label: 'Solicitudes', icon: Ticket, roles: ['admin', 'tecnico', 'usuario'] },
  { to: '/formularios', label: 'Formularios', icon: FileText, roles: ['admin', 'tecnico', 'usuario'] },
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
                    <div className="absolute right-0 mt-1 w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-navy-700 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 z-20 flex flex-col animate-[fadeIn_0.15s_ease]">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-navy-600 flex items-center justify-between">
                        <p className="text-sm font-semibold text-navy-500 dark:text-white">Actividad reciente</p>
                        {notifs && notifs.length > 0 && (
                          <span className="text-xs text-slate-400">{notifs.filter(n => !n.leida).length} sin leer</span>
                        )}
                      </div>

                      {/* Lista */}
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-navy-600">
                        {loadingNotifs ? (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">Cargando...</div>
                        ) : !notifs || notifs.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">Sin actividad reciente</div>
                        ) : notifs.map(item => {
                          const esCreacion = item.operacion === 'INSERT';
                          const esCambioEstado = item.campo === 'estado';
                          return (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 px-4 py-3 transition-colors ${item.leida ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-navy-600'}`}
                            >
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
                              <div className="flex flex-col gap-1 shrink-0 ml-1">
                                <button
                                  onClick={() => marcarLeida(item.id)}
                                  disabled={item.leida}
                                  title="Marcar como leído"
                                  className="p-1 rounded text-cgreen-500 hover:bg-cgreen-50 dark:hover:bg-cgreen-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Check size={11} />
                                </button>
                                <button
                                  onClick={() => borrarNotif(item.id)}
                                  title="Borrar"
                                  className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer acciones globales */}
                      <div className="px-3 py-2.5 border-t border-slate-200 dark:border-navy-600 flex items-center gap-2">
                        <NavLink
                          to="/dashboard"
                          onClick={() => setBellOpen(false)}
                          className="text-xs text-orange-500 hover:text-orange-600 font-medium mr-auto"
                        >
                          Ver todo →
                        </NavLink>
                        <button
                          onClick={marcarTodasLeidas}
                          className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-navy-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-500 transition-colors"
                        >
                          Marcar leídas
                        </button>
                        <button
                          onClick={borrarTodas}
                          className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          Borrar todas
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* User menu (solo autenticado) */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenu(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{user.nombre?.[0]?.toUpperCase()}</span>
                  </div>
                  <span className="hidden sm:block text-sm text-white font-medium max-w-28 truncate">{user.nombre}</span>
                  <ChevronDown size={14} className="text-navy-200" />
                </button>

                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-navy-700 rounded-xl shadow-lg border border-slate-200 dark:border-navy-600 z-20 py-1 animate-[fadeIn_0.15s_ease]">
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
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
              >
                <LogIn size={15} />
                <span className="hidden sm:block">Iniciar sesión</span>
              </NavLink>
            )}

            {/* Mobile hamburger (solo autenticado con items visibles) */}
            {user && visibleItems.length > 0 && (
              <button
                onClick={() => setOpen(v => !v)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-3 space-y-1 animate-[fadeIn_0.15s_ease]">
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
