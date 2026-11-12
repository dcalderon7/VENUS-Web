import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Activity,
  Film,
  FolderHeart,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Share2,
  Tv,
  Users,
  X
} from 'lucide-react'
import { Brand } from './Brand'
import { useAuth } from '../context/AuthContext'

const mainNavigation = [
  { to: '/catalog', label: 'Catálogo', icon: Film },
  { to: '/library', label: 'Mi biblioteca', icon: FolderHeart },
  { to: '/shared', label: 'Compartidas', icon: Share2 },
  { to: '/watch-party', label: 'Watch Party', icon: Tv },
]

const adminNavigation = [
  { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { to: '/users', label: 'Usuarios', icon: Users },
  { to: '/media', label: 'Archivos multimedia', icon: HardDrive },
  { to: '/activity', label: 'Actividad reciente', icon: Activity },
]

export function AppLayout() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, isAdmin, signOut } = useAuth()

  return (
    <div className="app-shell">
      <button className="mobile-menu" onClick={() => setIsOpen(!isOpen)} aria-label="Abrir menú">
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <Brand />

        <div className="sidebar__label">Navegación</div>
        <nav className="sidebar__nav">
          {mainNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => (isActive ? 'nav-item nav-item--active' : 'nav-item')}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {isAdmin && (
          <>
            <div className="sidebar__label">Administración</div>
            <nav className="sidebar__nav">
              {adminNavigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => (isActive ? 'nav-item nav-item--active' : 'nav-item')}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </>
        )}

        <div className="sidebar__bottom">
          <NavLink
            to="/settings"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => (isActive ? 'nav-item nav-item--active' : 'nav-item')}
          >
            <Settings size={18} />
            <span>Configuración</span>
          </NavLink>
          <div className="sidebar__user">
            <div className="avatar">{(user?.name || user?.username || 'U').charAt(0).toUpperCase()}</div>
            <div>
              <strong>{user?.name || user?.username || 'Usuario'}</strong>
              <small>{user?.role || 'Rol no informado'}</small>
            </div>
          </div>
          <button className="nav-item sidebar__logout" onClick={signOut}>
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
      {isOpen && <button className="sidebar-backdrop" onClick={() => setIsOpen(false)} aria-label="Cerrar menú" />}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
