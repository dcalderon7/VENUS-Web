import { Eye, Filter, RefreshCw, Search, ShieldCheck, UserRound, X } from 'lucide-react'
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { getAdminUser, getAdminUsers, requestAdminPasswordReset, updateAdminUserRole } from '../services/api'

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'collaborator', label: 'Colaborador' },
  { value: 'user', label: 'Usuario' },
]

const ROLE_LABELS = Object.fromEntries(ROLES.map(({ value, label }) => [value, label]))

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function RoleBadge({ role }) {
  return <span className={`role-badge role-badge--${role}`}><span />{ROLE_LABELS[role] || role}</span>
}

function getUserRequestError(error) {
  if (error?.status === 401) return 'Tu sesión ya no es válida. Inicia sesión nuevamente.'
  if (error?.status === 403) return 'No tienes permisos para consultar este usuario.'
  if (error?.status >= 500) return 'El servidor no pudo cargar el perfil. Inténtalo nuevamente.'
  return error?.message || 'No se pudo cargar el perfil del usuario.'
}

class UserDetailsErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Error al renderizar el detalle del usuario:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="user-dialog-backdrop">
          <aside className="user-drawer" role="dialog" aria-modal="true" aria-labelledby="user-detail-error-title">
            <div className="user-drawer__header">
              <div><span className="eyebrow"><UserRound size={14} /> Perfil administrativo</span><h2 id="user-detail-error-title">No se pudo mostrar el perfil</h2></div>
              <button className="icon-button" onClick={this.props.onClose} aria-label="Cerrar detalles"><X size={18} /></button>
            </div>
            <div className="alert-message">Los datos recibidos no tienen el formato esperado. Puedes cerrar este panel y seleccionar otro usuario.</div>
            <button className="refresh-button" onClick={this.props.onClose}>Cerrar</button>
          </aside>
        </div>
      )
    }

    return this.props.children
  }
}

function UserDetails({ user, onClose, onRoleChange, onPasswordReset, isUpdating, currentUserId, error, resetMessage }) {
  const [role, setRole] = useState(user?.role || 'user')
  const isSelf = user?.id === currentUserId

  useEffect(() => {
    setRole(user?.role || 'user')
  }, [user?.role])

  async function handleRoleSubmit(event) {
    event.preventDefault()
    if (!user?.id || isSelf || role === user.role) return
    if (!window.confirm(`¿Confirmas cambiar el rol de ${user.username} a ${ROLE_LABELS[role]}?`)) return
    await onRoleChange(user.id, role)
  }

  return <div className="user-dialog-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <aside className="user-drawer" role="dialog" aria-modal="true" aria-labelledby="user-detail-title">
      <div className="user-drawer__header">
        <div><span className="eyebrow"><UserRound size={14} /> Perfil administrativo</span><h2 id="user-detail-title">{user.username || 'Usuario'}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Cerrar detalles"><X size={18} /></button>
      </div>
      <div className="user-detail__identity"><span className="user-avatar user-avatar--large">{(user.name || user.username || 'U').charAt(0).toUpperCase()}</span><div><strong>{user.name || 'Sin nombre'}</strong><small>{user.email || 'Correo no informado'}</small></div></div>
      <dl className="user-detail-list">
        <div><dt>Identificador</dt><dd className="user-detail-list__id">{user.id || '—'}</dd></div>
        <div><dt>Usuario</dt><dd>{user.username || '—'}</dd></div>
        <div><dt>Correo</dt><dd>{user.email || '—'}</dd></div>
        <div><dt>Rol actual</dt><dd><RoleBadge role={user.role || 'user'} /></dd></div>
        <div><dt>Fecha de registro</dt><dd>{formatDate(user.created_at)}</dd></div>
      </dl>
      {error && <div className="alert-message users-detail-error">{error}</div>}
      <form className="role-form" onSubmit={handleRoleSubmit}>
        <label htmlFor="user-role">Cambiar rol</label>
        <select id="user-role" value={role} onChange={(event) => setRole(event.target.value)} disabled={isSelf || isUpdating}>{ROLES.map(({ value, label }) => <option value={value} key={value}>{label}</option>)}</select>
        {isSelf && <p className="form-hint">No puedes modificar tu propio rol administrativo.</p>}
        {!isSelf && <button className="button button--primary role-form__button" type="submit" disabled={role === user.role || isUpdating}>{isUpdating ? 'Guardando...' : 'Guardar nuevo rol'}</button>}
      </form>
      {!isSelf && <div className="password-reset-box">
        <div className="password-reset-box__meta">
          <span className="password-reset-box__icon"><i className="bi bi-shield-lock-fill" aria-hidden="true" /></span>
          <div className="password-reset-box__content">
            <strong>Restablecer contraseña</strong>
            <p>Se enviará un enlace de un solo uso al correo del usuario.</p>
          </div>
        </div>
        <button className="button button--primary password-reset-box__button" type="button" onClick={() => onPasswordReset(user.id)} disabled={isUpdating}><i className="bi bi-send-fill" aria-hidden="true" /> Enviar enlace</button>
        {resetMessage && <p className="form-hint">{resetMessage}</p>}
      </div>}
    </aside>
  </div>
}

export function UsersPage() {
  const { token, user: currentUser, signOut } = useAuth()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [detailState, setDetailState] = useState('idle')
  const [detailError, setDetailError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const detailRequestId = useRef(0)
  const limit = 20

  const loadUsers = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      const response = await getAdminUsers(token, { page, limit, search, role })
      setItems(Array.isArray(response?.items) ? response.items : [])
      setTotal(Number.isFinite(response?.total) ? response.total : 0)
      setState('ready')
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut()
        return
      }
      setError(requestError.status === 403 ? 'Acceso administrativo denegado.' : getUserRequestError(requestError))
      setState('error')
    }
  }, [limit, page, role, search, signOut, token])

  useEffect(() => { loadUsers() }, [loadUsers])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasFilters = useMemo(() => Boolean(search || role), [role, search])

  function handleRoleChange(event) {
    setRole(event.target.value)
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
    setRole('')
    setPage(1)
  }

  async function openUser(userId) {
    const requestId = ++detailRequestId.current
    setSelectedUser(null)
    setDetailState('loading')
    setDetailError('')
    setResetMessage('')
    try {
      const response = await getAdminUser(token, userId)
      if (requestId !== detailRequestId.current) return
      if (!response?.user || typeof response.user !== 'object') {
        throw new Error('El servidor no devolvió los datos del usuario.')
      }
      setSelectedUser(response.user)
      setDetailState('ready')
    } catch (requestError) {
      if (requestId !== detailRequestId.current) return
      if (requestError.status === 401) {
        signOut()
        return
      }
      setDetailError(getUserRequestError(requestError))
      setDetailState('error')
    }
  }

  async function handleRoleUpdate(userId, nextRole) {
    setIsUpdating(true)
    setDetailError('')
    try {
      const response = await updateAdminUserRole(token, userId, nextRole)
      if (response?.user) setSelectedUser(response.user)
      await loadUsers()
    } catch (requestError) {
      if (requestError.status === 401) signOut()
      setDetailError(getUserRequestError(requestError))
    } finally {
      setIsUpdating(false)
    }
  }

  async function handlePasswordReset(userId) {
    if (!window.confirm('¿Confirmas enviar un enlace de restablecimiento al correo registrado?')) return
    setIsUpdating(true)
    setDetailError('')
    setResetMessage('')
    try {
      const response = await requestAdminPasswordReset(token, userId)
      setResetMessage(response?.message || 'Enlace enviado correctamente.')
    } catch (requestError) {
      if (requestError.status === 401) signOut()
      setDetailError(getUserRequestError(requestError))
    } finally {
      setIsUpdating(false)
    }
  }

  return <div className="page">
    <header className="page-header"><div><span className="eyebrow"><ShieldCheck size={14} /> Sección administrativa</span><h1>Usuarios</h1><p>Administra perfiles y permisos de las cuentas registradas en VENUS.</p></div><button className="refresh-button" onClick={loadUsers} disabled={state === 'loading'}><RefreshCw size={15} /> Actualizar</button></header>
    <section className="panel users-panel">
      <div className="users-toolbar"><label className="search-field"><Search size={16} /><span className="sr-only">Buscar usuario o correo</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Buscar por usuario o correo..." /></label><label className="role-filter"><Filter size={15} /><span className="sr-only">Filtrar por rol</span><select value={role} onChange={handleRoleChange}><option value="">Todos los roles</option>{ROLES.map(({ value, label }) => <option value={value} key={value}>{label}</option>)}</select></label>{hasFilters && <button className="clear-filter" onClick={clearFilters}>Limpiar filtros</button>}</div>
      {state === 'error' && <div className="alert-message">{error}</div>}
      {state === 'loading' ? <div className="table-loading">Cargando usuarios reales...</div> : items.length ? <div className="data-table-wrap"><table className="data-table users-table"><thead><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Registro</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><button className="user-link" onClick={() => openUser(item.id)}><span className="user-avatar">{(item.name || item.username || 'U').charAt(0).toUpperCase()}</span><strong>{item.username}</strong></button></td><td>{item.name || '—'}</td><td>{item.email}</td><td><RoleBadge role={item.role} /></td><td>{formatDate(item.created_at)}</td><td><button className="view-user-button" onClick={() => openUser(item.id)}><Eye size={14} /> Ver</button></td></tr>)}</tbody></table></div> : <EmptyState title={hasFilters ? 'No hay coincidencias' : 'No hay usuarios'} description={hasFilters ? 'Prueba con otros filtros de búsqueda.' : 'La API no devolvió cuentas registradas.'} />}
      {state !== 'loading' && <div className="pagination"><span>{total} registros</span><div><button className="pagination-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {totalPages}</span><button className="pagination-button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button></div></div>}
    </section>
    {detailState === 'loading' && <div className="user-dialog-backdrop"><aside className="user-drawer user-drawer--loading"><div className="table-loading">Cargando perfil...</div></aside></div>}
    {detailState === 'error' && <div className="user-dialog-backdrop"><aside className="user-drawer"><div className="alert-message">{detailError}</div><button className="refresh-button" onClick={() => setDetailState('idle')}>Cerrar</button></aside></div>}
    {detailState === 'ready' && selectedUser && <UserDetailsErrorBoundary key={selectedUser.id || selectedUser.username} onClose={() => setDetailState('idle')}><UserDetails user={selectedUser} currentUserId={currentUser?.id} onClose={() => setDetailState('idle')} onRoleChange={handleRoleUpdate} onPasswordReset={handlePasswordReset} isUpdating={isUpdating} error={detailError} resetMessage={resetMessage} /></UserDetailsErrorBoundary>}
  </div>
}
