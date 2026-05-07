import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Ticket, Users, UserCog, LogOut, Menu, X, ChevronDown, BarChart2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

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
          <NavLink to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IT</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-bold text-sm leading-none">Soporte TI</p>
              <p className="text-navy-200 text-xs leading-none">ISTHO S.A.S.</p>
            </div>
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
