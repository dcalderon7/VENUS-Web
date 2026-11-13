import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Film, HardDrive, Play, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { UploadMediaModal } from '../components/UploadMediaModal'
import { VideoPlayerModal } from '../components/VideoPlayerModal'
import { useAuth } from '../context/AuthContext'
import { getMediaLibrary } from '../services/api'
import { fetchMovieDetails, getTmdbImageUrl } from '../services/tmdb'

export function LibraryPage() {
  const { token, signOut } = useAuth()
  const [libraryData, setLibraryData] = useState({ cataloged: [], independent: [] })
  const [tmdbMeta, setTmdbMeta] = useState({})
  const [filterType, setFilterType] = useState('all') // 'all', 'cataloged', 'independent'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  const [playerOpen, setPlayerOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [currentPlaybackMedia, setCurrentPlaybackMedia] = useState(null)

  const loadLibrary = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      const data = await getMediaLibrary(token)
      setLibraryData({
        cataloged: data.cataloged || [],
        independent: data.independent || []
      })
      setState('ready')

      // Fetch TMDB metadata for cataloged items asynchronously
      if (data.cataloged && data.cataloged.length) {
        data.cataloged.forEach(async (item) => {
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
      }
    } catch (err) {
      if (err.status === 401) {
        signOut()
        return
      }
      setError(err.message || 'Error al consultar Mi Biblioteca.')
      setState('error')
    }
  }, [token, signOut])

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  // Combine & deduplicate items
  const allItems = useMemo(() => {
    const list = []
    const seenIds = new Set()

    if (filterType === 'all' || filterType === 'cataloged') {
      libraryData.cataloged.forEach((item) => {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id)
          list.push({ ...item, isIndependent: false })
        }
      })
    }

    if (filterType === 'all' || filterType === 'independent') {
      libraryData.independent.forEach((item) => {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id)
          list.push({ ...item, isIndependent: true })
        }
      })
    }

    return list
  }, [libraryData, filterType])

  // Filter & Sort items
  const filteredItems = useMemo(() => {
    let result = allItems

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((item) => {
        const title = item.display_title || item.file_name || ''
        const tmdbDetail = tmdbMeta[String(item.tmdb_id)]
        const tmdbTitle = tmdbDetail?.title || ''
        return title.toLowerCase().includes(q) || tmdbTitle.toLowerCase().includes(q)
      })
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    } else if (sortBy === 'title') {
      result.sort((a, b) => {
        const titleA = a.display_title || tmdbMeta[String(a.tmdb_id)]?.title || a.file_name || ''
        const titleB = b.display_title || tmdbMeta[String(b.tmdb_id)]?.title || b.file_name || ''
        return titleA.localeCompare(titleB)
      })
    } else if (sortBy === 'size') {
      result.sort((a, b) => (Number(b.file_size) || 0) - (Number(a.file_size) || 0))
    }

    return result
  }, [allItems, searchQuery, sortBy, tmdbMeta])

  const totalSize = useMemo(() => {
    return allItems.reduce((acc, item) => acc + (Number(item.file_size) || 0), 0)
  }, [allItems])

  const handlePlayMedia = (item) => {
    setCurrentPlaybackMedia(item)
    setPlayerOpen(true)
  }

  return (
    <div className="page library-page">
      <header className="page-header">
        <div>
          <span className="eyebrow"><HardDrive size={14} /> Tu servidor privado</span>
          <h1>Mi Biblioteca</h1>
          <p>Consulta las películas y archivos disponibles en tu servidor VENUS y reprodúcelos al instante.</p>
        </div>
        <div className="header-action-group">
          <button className="button button--primary" onClick={() => setUploadOpen(true)}>
            <Plus size={16} /> AGREGAR PELÍCULA
          </button>
          <button className="refresh-button" onClick={loadLibrary} disabled={state === 'loading'}>
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>
      </header>

      {/* Library Stats */}
      <section className="stat-grid library-stats">
        <article className="stat-card">
          <div className="stat-card__top">
            <span>Películas Disponibles</span>
            <Film size={18} />
          </div>
          <strong>{state === 'loading' ? '—' : libraryData.cataloged.length}</strong>
          <small>Títulos asociados a TMDB</small>
        </article>
        <article className="stat-card">
          <div className="stat-card__top">
            <span>Archivos Independientes</span>
            <HardDrive size={18} />
          </div>
          <strong>{state === 'loading' ? '—' : libraryData.independent.length}</strong>
          <small>Videos cargados sin TMDB</small>
        </article>
        <article className="stat-card">
          <div className="stat-card__top">
            <span>Almacenamiento Usado</span>
            <ShieldCheck size={18} />
          </div>
          <strong>{state === 'loading' ? '—' : `${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`}</strong>
          <small>Total en disco servidor</small>
        </article>
      </section>

      {/* Toolbar & Search */}
      <section className="catalog-toolbar panel">
        <div className="catalog-search-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Buscar en tu biblioteca por título o nombre de archivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="catalog-filter-group">
          <div className="category-tabs">
            <button
              className={`tab-btn ${filterType === 'all' ? 'tab-btn--active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Todas ({libraryData.cataloged.length + libraryData.independent.length})
            </button>
            <button
              className={`tab-btn ${filterType === 'cataloged' ? 'tab-btn--active' : ''}`}
              onClick={() => setFilterType('cataloged')}
            >
              Catalogadas ({libraryData.cataloged.length})
            </button>
            <button
              className={`tab-btn ${filterType === 'independent' ? 'tab-btn--active' : ''}`}
              onClick={() => setFilterType('independent')}
            >
              Independientes ({libraryData.independent.length})
            </button>
          </div>

          <select
            className="genre-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Más recientes</option>
            <option value="title">Título (A-Z)</option>
            <option value="size">Tamaño de archivo</option>
          </select>
        </div>
      </section>

      {error && <div className="alert-message">{error}</div>}

      {/* Library Grid */}
      {state === 'loading' ? (
        <div className="table-loading">Cargando películas disponibles en Mi Biblioteca...</div>
      ) : filteredItems.length > 0 ? (
        <div className="library-grid">
          {filteredItems.map((item) => {
            const tmdb = tmdbMeta[String(item.tmdb_id)]
            const posterUrl = tmdb ? getTmdbImageUrl(tmdb.poster_path) : null
            const displayTitle = item.display_title || tmdb?.title || item.file_name || `Video #${item.id}`
            const fileSizeMb = (Number(item.file_size) / 1024 / 1024).toFixed(1)

            return (
              <article key={item.id} className="library-card">
                <div className="poster-container" onClick={() => handlePlayMedia(item)}>
                  {posterUrl ? (
                    <img src={posterUrl} alt={displayTitle} className="movie-poster" loading="lazy" />
                  ) : (
                    <div className="poster-fallback poster-fallback--video">
                      <Film size={40} />
                      <span>{displayTitle}</span>
                    </div>
                  )}

                  <span className="availability-tag tag--available">
                    <CheckCircle2 size={12} /> Disponible
                  </span>

                  {item.file_format && (
                    <span className="format-badge">{item.file_format.toUpperCase()}</span>
                  )}
                </div>

                <div className="movie-card-info">
                  <h3 className="movie-title" title={displayTitle}>
                    {displayTitle}
                  </h3>
                  <div className="library-card-meta">
                    <small>{fileSizeMb} MB</small>
                    <small>·</small>
                    <small>{new Date(item.created_at).toLocaleDateString('es-MX')}</small>
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
          <p>No hay películas o archivos disponibles en esta vista.</p>
        </div>
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={playerOpen}
        onClose={() => setPlayerOpen(false)}
        media={currentPlaybackMedia}
        title={currentPlaybackMedia?.display_title || tmdbMeta[String(currentPlaybackMedia?.tmdb_id)]?.title}
      />

      {/* Upload & Server Import Modal */}
      <UploadMediaModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => loadLibrary()}
        token={token}
      />
    </div>
  )
}
