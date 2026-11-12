import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="auth-loading">
        <span className="loading-dot" />
        Comprobando sesión...
      </main>
    )
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function AdminRoute() {
  const { status, user, isAdmin, signOut } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="auth-loading">
        <span className="loading-dot" />
        Comprobando sesión...
      </main>
    )
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAdmin) {
    return (
      <main className="access-denied">
        <div>
          <span className="eyebrow">Acceso restringido</span>
          <h1>Se requiere rol de administrador</h1>
          <p>Tu sesión es válida, pero esta sección requiere permisos administrativos.</p>
          <button className="button button--primary" onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      </main>
    )
  }

  return <Outlet />
}
