import { Activity, Check, Film, HardDrive, Pencil, RefreshCw, Settings, Trash2, Users, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { deleteMedia, getAdminActivity, getAdminCatalog, getAdminMedia, getAdminUsers, updateMediaTitle } from '../services/api'

const pageConfig = {
  users: { title: 'Usuarios', description: 'Cuentas registradas en VENUS.', icon: Users, fetch: getAdminUsers, columns: [['name', 'Nombre'], ['username', 'Usuario'], ['email', 'Correo'], ['role', 'Rol'], ['created_at', 'Registro']] },
  catalog: { title: 'Películas y series', description: 'Catálogo agrupado por contenido almacenado.', icon: Film, fetch: getAdminCatalog, columns: [['tmdb_id', 'TMDB ID'], ['media_type', 'Tipo'], ['file_count', 'Archivos'], ['latest_created_at', 'Última carga']] },
  media: { title: 'Archivos multimedia', description: 'Archivos físicos registrados en VENUS.', icon: HardDrive, fetch: getAdminMedia, columns: [['file_name', 'Archivo'], ['display_title', 'Nombre mostrado'], ['tmdb_id', 'TMDB ID'], ['media_type', 'Tipo'], ['file_format', 'Formato'], ['file_size', 'Tamaño'], ['uploaded_by', 'Subido por'], ['created_at', 'Fecha']] },
  activity: { title: 'Actividad reciente', description: 'Reproducciones registradas en watch_history.', icon: Activity, fetch: getAdminActivity, columns: [['user_name', 'Usuario'], ['tmdb_id', 'TMDB ID'], ['media_type', 'Tipo'], ['playback_position', 'Posición'], ['updated_at', 'Fecha']] },
}

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (key.endsWith('_at')) return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  if (key === 'file_size') return `${(Number(value) / 1024 / 1024).toFixed(2)} MB`
  if (key === 'media_type') return value === 'movie' ? 'Película' : value === 'tv' || value === 'series' ? 'Serie' : value
  return value
}

export function PlaceholderPage({ type }) {
  const config = pageConfig[type]
  const Icon = config?.icon
  const { token, signOut } = useAuth()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [state, setState] = useState(type === 'settings' ? 'empty' : 'loading')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [actionState, setActionState] = useState(null)
  const limit = 20

  const loadData = useCallback(async () => {
    if (!config) return
    setState('loading')
    setError('')
    try {
      const response = await config.fetch(token, { page, limit })
      setItems(response.items || [])
      setTotal(response.total || 0)
      setState('ready')
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut()
        return
      }
      setError(requestError.status === 403 ? 'Acceso administrativo denegado.' : requestError.message)
      setState('error')
    }
  }, [config, page, token, signOut])

  useEffect(() => {
    loadData()
  }, [loadData])

  function beginEdit(item) {
    setEditingId(item.id)
    setEditingTitle(item.display_title || item.file_name || '')
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
  }

  async function saveTitle(item) {
    const title = editingTitle.trim()
    if (!title) {
      setError('El nombre del video no puede estar vacío.')
      return
    }

    setActionState(item.id)
    setError('')
    try {
      await updateMediaTitle(token, item.id, title)
      setItems((currentItems) => currentItems.map((currentItem) => currentItem.id === item.id
        ? { ...currentItem, display_title: title }
        : currentItem))
      cancelEdit()
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut()
        return
      }
      setError(requestError.status === 403 ? 'No tienes permisos para editar este video.' : requestError.message)
    } finally {
      setActionState(null)
    }
  }

  async function removeMedia(item) {
    const title = item.display_title || item.file_name || 'este video'
    if (!window.confirm(`¿Eliminar ${title}? Esta acción también borra el archivo del servidor.`)) return

    setActionState(item.id)
    setError('')
    try {
      await deleteMedia(token, item.id)
      setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id))
      setTotal((currentTotal) => Math.max(0, currentTotal - 1))
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut()
        return
      }
      setError(requestError.status === 403 ? 'No tienes permisos para eliminar este video.' : requestError.message)
    } finally {
      setActionState(null)
    }
  }

  if (type === 'settings') {
    return <div className="page"><header className="page-header"><div><span className="eyebrow"><Settings size={14} /> Sección</span><h1>Configuración</h1><p>Preferencias y parámetros del panel administrativo.</p></div></header><section className="panel page-placeholder"><EmptyState title="Configuración pendiente" description="El backend actual no expone endpoints administrativos de configuración." /></section></div>
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  return <div className="page">
    <header className="page-header"><div><span className="eyebrow"><Icon size={14} /> Sección administrativa</span><h1>{config.title}</h1><p>{config.description}</p></div><button className="refresh-button" onClick={loadData} disabled={state === 'loading'}><RefreshCw size={15} /> Actualizar</button></header>
    {error && <div className="alert-message">{error}</div>}
    <section className="panel table-panel">
      {state === 'loading' ? <div className="table-loading">Cargando datos reales...</div> : items.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr>{config.columns.map(([, label]) => <th key={label}>{label}</th>)}{type === 'media' && <th>Acciones</th>}</tr></thead><tbody>{items.map((item, index) => <tr key={item.id || `${page}-${index}`}>{config.columns.map(([key]) => <td key={key}>{type === 'media' && key === 'display_title' && editingId === item.id ? <input className="table-input" value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveTitle(item); if (event.key === 'Escape') cancelEdit() }} autoFocus /> : formatValue(key, item[key])}</td>)}{type === 'media' && <td><div className="table-actions">{editingId === item.id ? <><button className="icon-button icon-button--success" onClick={() => saveTitle(item)} disabled={actionState === item.id} aria-label="Guardar nombre"><Check size={16} /></button><button className="icon-button" onClick={cancelEdit} disabled={actionState === item.id} aria-label="Cancelar edición"><X size={16} /></button></> : <><button className="icon-button" onClick={() => beginEdit(item)} disabled={actionState === item.id} aria-label="Editar nombre"><Pencil size={16} /></button><button className="icon-button icon-button--danger" onClick={() => removeMedia(item)} disabled={actionState === item.id} aria-label="Eliminar video"><Trash2 size={16} /></button></>}</div></td>}</tr>)}</tbody></table></div> : <EmptyState title={`No hay ${config.title.toLowerCase()}`} description="La API no devolvió registros para esta sección." />}
      {state !== 'loading' && <div className="pagination"><span>{total} registros</span><div><button className="pagination-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {totalPages}</span><button className="pagination-button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button></div></div>}
    </section>
  </div>
}
