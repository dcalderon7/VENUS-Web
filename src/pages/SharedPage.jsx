import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Film, Play, RefreshCw, Search, Share2, User } from 'lucide-react'
import { VideoPlayerModal } from '../components/VideoPlayerModal'
import { useAuth } from '../context/AuthContext'
import { getAdminUsers, getMediaLibrary } from '../services/api'
import { fetchMovieDetails, getTmdbImageUrl } from '../services/tmdb'

export function SharedPage() {
  const { token, user: currentUser, isAdmin, signOut } = useAuth()
  const [mediaList, setMediaList] = useState([])
  const [usersMap, setUsersMap] = useState({})
  const [tmdbMeta, setTmdbMeta] = useState({})
  const [filterOwner, setFilterOwner] = useState('all') // 'all', 'others', 'mine'
  const [searchQuery, setSearchQuery] = useState('')
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  const [playerOpen, setPlayerOpen] = useState(false)
  const [currentPlaybackMedia, setCurrentPlaybackMedia] = useState(null)

  const loadSharedData = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      // 1. Load library media files
      const library = await getMediaLibrary(token)
      const cataloged = library.cataloged || []
      const independent = library.independent || []
      const combined = [...cataloged, ...independent]

      // Deduplicate by media ID or TMDB ID
      const uniqueMedia = []
      const seenTmdb = new Set()
      const seenId = new Set()

      combined.forEach((item) => {
        if (item.id && !seenId.has(item.id)) {
          seenId.add(item.id)
          // Avoid duplicate display of same TMDB movie
          if (item.tmdb_id && seenTmdb.has(String(item.tmdb_id))) {
            return
          }
          if (item.tmdb_id) seenTmdb.add(String(item.tmdb_id))
          uniqueMedia.push(item)
        }
      })

      setMediaList(uniqueMedia)

      // 2. Load user profiles map if admin or available
      if (isAdmin) {
        try {
          const usersRes = await getAdminUsers(token, { limit: 100 })
          if (usersRes?.items) {
            const map = {}
            usersRes.items.forEach((u) => {
              map[u.id] = u
            })
            setUsersMap(map)
          }
        } catch (e) {
          console.warn('Could not fetch admin user list:', e.message)
        }
      }

      setState('ready')

      // 3. Fetch TMDB details
      uniqueMedia.forEach(async (item) => {
        if (item.tmdb_id) {
          const details = await fetchMovieDetails(item.tmdb_id)
          if (details) {
            setTmdbMeta((prev) => ({
              ...prev,
              [String(item.tmdb_id)]: details
            }))
          }
        }
      })
    } catch (err) {
      if (err.status === 401) {
        signOut()
        return
      }
      setError(err.message || 'Error al obtener las películas compartidas.')
      setState('error')
    }
  }, [token, isAdmin, signOut])

  useEffect(() => {
    loadSharedData()
  }, [loadSharedData])

  // Helper to format contributor name
  const getContributorInfo = (uploadedBy) => {
    if (!uploadedBy) return { name: 'Comunidad VENUS', role: 'Colaborador', isMe: false }
    if (currentUser && uploadedBy === currentUser.id) {
      return {
        name: `${currentUser.name || currentUser.username} (Tú)`,
        role: currentUser.role || 'Usuario',
        isMe: true
      }
    }
    const knownUser = usersMap[uploadedBy]
    if (knownUser) {
      return {
        name: knownUser.name || knownUser.username,
        role: knownUser.role || 'Colaborador',
        isMe: false
      }
    }
    return {
      name: `Usuario #${uploadedBy.slice(0, 8)}`,
      role: 'Colaborador',
      isMe: false
    }
  }

  // Filter items
  const filteredItems = useMemo(() => {
    return mediaList.filter((item) => {
      const contributor = getContributorInfo(item.uploaded_by)

      // Owner filter
      if (filterOwner === 'mine' && !contributor.isMe) return false
      if (filterOwner === 'others' && contributor.isMe) return false

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const title = (item.display_title || item.file_name || '').toLowerCase()
        const tmdbTitle = (tmdbMeta[String(item.tmdb_id)]?.title || '').toLowerCase()
        const contributorName = contributor.name.toLowerCase()
        return title.includes(q) || tmdbTitle.includes(q) || contributorName.includes(q)
      }

      return true
    })
  }, [mediaList, filterOwner, searchQuery, usersMap, currentUser, tmdbMeta])

  const handlePlayMedia = (item) => {
    setCurrentPlaybackMedia(item)
    setPlayerOpen(true)
  }

  return (
    <div className="page shared-page">
      <header className="page-header">
        <div>
          <span className="eyebrow"><Share2 size={14} /> Red Comunitaria</span>
          <h1>Películas Compartidas</h1>
          <p>Explora y reproduce películas aportadas por los usuarios de la comunidad VENUS.</p>
        </div>
        <button className="refresh-button" onClick={loadSharedData} disabled={state === 'loading'}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </header>

      {/* Toolbar */}
      <section className="catalog-toolbar panel">
        <div className="catalog-search-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Buscar por película, título o usuario que aportó..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="catalog-filter-group">
          <div className="category-tabs">
            <button
              className={`tab-btn ${filterOwner === 'all' ? 'tab-btn--active' : ''}`}
              onClick={() => setFilterOwner('all')}
            >
              Todas las compartidas
            </button>
            <button
              className={`tab-btn ${filterOwner === 'others' ? 'tab-btn--active' : ''}`}
              onClick={() => setFilterOwner('others')}
            >
              Aportadas por otros
            </button>
            <button
              className={`tab-btn ${filterOwner === 'mine' ? 'tab-btn--active' : ''}`}
              onClick={() => setFilterOwner('mine')}
            >
              Aportadas por mí
            </button>
          </div>
        </div>
      </section>

      {error && <div className="alert-message">{error}</div>}

      {/* Shared Grid */}
      {state === 'loading' ? (
        <div className="table-loading">Cargando películas compartidas...</div>
      ) : filteredItems.length > 0 ? (
        <div className="shared-grid">
          {filteredItems.map((item) => {
            const tmdb = tmdbMeta[String(item.tmdb_id)]
            const posterUrl = tmdb ? getTmdbImageUrl(tmdb.poster_path) : null
            const displayTitle = item.display_title || tmdb?.title || item.file_name || `Película #${item.id}`
            const contributor = getContributorInfo(item.uploaded_by)

            return (
              <article key={item.id} className="shared-card">
                <div className="poster-container" onClick={() => handlePlayMedia(item)}>
                  {posterUrl ? (
                    <img src={posterUrl} alt={displayTitle} className="movie-poster" loading="lazy" />
                  ) : (
                    <div className="poster-fallback poster-fallback--shared">
                      <Film size={40} />
                      <span>{displayTitle}</span>
                    </div>
                  )}

                  <span className="availability-tag tag--available">
                    <CheckCircle2 size={12} /> Disponible para reproducir
                  </span>

                  {item.file_format && (
                    <span className="format-badge">{item.file_format.toUpperCase()}</span>
                  )}
                </div>

                <div className="shared-card-content">
                  <h3 className="movie-title" title={displayTitle}>
                    {displayTitle}
                  </h3>

                  {/* Contributor badge */}
                  <div className={`contributor-badge ${contributor.isMe ? 'contributor-badge--me' : ''}`}>
                    <span className="contributor-avatar">
                      {contributor.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="contributor-meta">
                      <strong>Aportado por {contributor.name}</strong>
                      <small>{contributor.role}</small>
                    </div>
                  </div>
                </div>

                <div className="movie-card-actions">
                  <button
                    className="button button--primary card-action-btn"
                    onClick={() => handlePlayMedia(item)}
                  >
                    <Play size={16} /> REPRODUCIR
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="panel empty-catalog-panel">
          <p>No se encontraron películas compartidas con los filtros actuales.</p>
        </div>
      )}

      {/* Player modal */}
      <VideoPlayerModal
        isOpen={playerOpen}
        onClose={() => setPlayerOpen(false)}
        media={currentPlaybackMedia}
        title={currentPlaybackMedia?.display_title || tmdbMeta[String(currentPlaybackMedia?.tmdb_id)]?.title}
      />
    </div>
  )
}
