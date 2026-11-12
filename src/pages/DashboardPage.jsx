import { Activity, Film, HardDrive, RefreshCw, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { getAdminActivity, getAdminCatalog, getAdminSummary } from '../services/api'

const cards = [
  { key: 'total_users', label: 'Usuarios registrados', icon: Users },
  { key: 'total_catalog_items', label: 'Títulos en catálogo', icon: Film },
  { key: 'total_media_files', label: 'Archivos multimedia', icon: HardDrive },
  { key: 'total_playbacks', label: 'Reproducciones', icon: Activity },
]

const formatDate = (date) => date
  ? new Date(date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  : '—'

const formatType = (type) => type === 'movie'
  ? 'Película'
  : type === 'tv' || type === 'series' ? 'Serie' : type || '—'

export function DashboardPage() {
  const { token, signOut } = useAuth()
  const [summary, setSummary] = useState(null)
  const [activity, setActivity] = useState([])
  const [catalog, setCatalog] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      const [summaryResponse, activityResponse, catalogResponse] = await Promise.all([
        getAdminSummary(token),
        getAdminActivity(token, { page: 1, limit: 5 }),
        getAdminCatalog(token, { page: 1, limit: 6 }),
      ])
      setSummary(summaryResponse.summary)
      setActivity(activityResponse.items || [])
      setCatalog(catalogResponse.items || [])
      setState('ready')
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut()
        return
      }
      setError(requestError.status === 403
        ? 'Tu sesión no tiene autorización administrativa para consultar estos datos.'
        : requestError.message)
      setState('error')
    }
  }, [token, signOut])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  return (
    <div className="page">
      <header className="page-header">
        <div><span className="eyebrow">Vista general</span><h1>Resumen</h1><p>El centro de control de tu plataforma VENUS.</p></div>
        <button className="refresh-button" onClick={loadDashboard} disabled={state === 'loading'}><RefreshCw size={15} /> Actualizar</button>
      </header>
      {state === 'error' && <div className="alert-message">{error}</div>}
      <section className="stat-grid">
        {cards.map(({ key, label, icon: Icon }) => (
          <article className="stat-card" key={label}>
            <div className="stat-card__top"><span>{label}</span><Icon size={18} /></div>
            <strong>{state === 'loading' ? <span className="skeleton-value" /> : summary?.[key] ?? '—'}</strong>
            <small>{state === 'loading' ? 'Cargando datos...' : 'Datos reales de PostgreSQL'}</small>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel__header"><div><h2>Actividad de la plataforma</h2><p>Registros reales de reproducciones recientes.</p></div><span className="status-pill">{activity.length} registros</span></div>
          <div className="chart-placeholder">
            <div className="chart-placeholder__grid" />
            {activity.length ? <div className="activity-bars">{activity.map((item, index) => <span key={item.id} style={{ height: `${35 + ((index * 17) % 55)}%` }} title={formatDate(item.updated_at)} />)}</div> : <EmptyState title="Sin actividad registrada" description="No existen reproducciones en watch_history." />}
          </div>
        </article>
        <article className="panel">
          <div className="panel__header"><div><h2>Actividad reciente</h2><p>Últimos eventos registrados.</p></div></div>
          {activity.length ? <div className="activity-list">{activity.map((item) => <div className="activity-item" key={item.id}><span className="activity-dot" /><div><strong>{item.user_name || item.username || 'Usuario'}</strong><small>{formatType(item.media_type)} · {item.tmdb_id}</small></div><time>{formatDate(item.updated_at)}</time></div>)}</div> : <EmptyState title="Aún no hay actividad" description="No hay reproducciones disponibles para mostrar." />}
        </article>
      </section>
      <section className="panel table-panel">
        <div className="panel__header"><div><h2>Contenido del catálogo</h2><p>Películas y series agrupadas desde archivos reales.</p></div><span className="status-pill">{catalog.length} títulos</span></div>
        {catalog.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>TMDB ID</th><th>Tipo</th><th>Archivos</th><th>Última carga</th></tr></thead><tbody>{catalog.map((item) => <tr key={`${item.tmdb_id}-${item.media_type}`}><td>{item.tmdb_id}</td><td><span className="type-badge">{formatType(item.media_type)}</span></td><td>{item.file_count}</td><td>{formatDate(item.latest_created_at)}</td></tr>)}</tbody></table></div> : <EmptyState title="Catálogo vacío" description="No hay títulos almacenados en media_files." />}
      </section>
    </div>
  )
}
