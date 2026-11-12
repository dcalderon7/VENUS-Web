import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Film, Info, Play, Plus, RefreshCw, Search, Star } from 'lucide-react'
import { MovieDetailsModal } from '../components/MovieDetailsModal'
import { UploadMediaModal } from '../components/UploadMediaModal'
import { VideoPlayerModal } from '../components/VideoPlayerModal'
import { useAuth } from '../context/AuthContext'
import { checkMediaAvailability, getMediaLibrary } from '../services/api'
import {
  TMDB_GENRES,
  fetchPopularMovies,
  fetchTopRatedMovies,
  fetchTrendingMovies,
  fetchUpcomingMovies,
  getTmdbImageUrl,
  searchTmdbMovies
} from '../services/tmdb'

export function CatalogPage() {
  const { token, signOut } = useAuth()
  const [category, setCategory] = useState('popular')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [movies, setMovies] = useState([])
  const [availabilityMap, setAvailabilityMap] = useState({})
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  // Modals state
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [currentPlaybackMedia, setCurrentPlaybackMedia] = useState(null)

  // Load server availability map
  const loadAvailability = useCallback(async () => {
    try {
      const library = await getMediaLibrary(token)
      const map = {}
      if (library?.cataloged && Array.isArray(library.cataloged)) {
        library.cataloged.forEach((item) => {
          if (item.tmdb_id) {
            map[String(item.tmdb_id)] = item
          }
        })
      }
      setAvailabilityMap(map)
    } catch (err) {
      if (err.status === 401) {
        signOut()
      }
      console.warn('Could not load media library availability map:', err.message)
    }
  }, [token, signOut])

  // Load TMDB catalog
  const loadCatalog = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      let results = []
      if (searchQuery.trim()) {
        results = await searchTmdbMovies(searchQuery)
      } else if (category === 'popular') {
        results = await fetchPopularMovies()
      } else if (category === 'trending') {
        results = await fetchTrendingMovies()
      } else if (category === 'top') {
        results = await fetchTopRatedMovies()
      } else if (category === 'upcoming') {
        results = await fetchUpcomingMovies()
      }

      // Filter by genre if selected
      if (selectedGenre) {
        const genreId = Number(selectedGenre)
        results = results.filter((m) => m.genre_ids?.includes(genreId))
      }

      setMovies(results || [])
      setState('ready')
    } catch (err) {
      setError('Error al consultar el catálogo de TMDB.')
      setState('error')
    }
  }, [category, searchQuery, selectedGenre])

  useEffect(() => {
    loadAvailability()
  }, [loadAvailability])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  const handlePlayMovie = (movie, media) => {
    const mediaObj = media || availabilityMap[String(movie.id)] || { tmdb_id: movie.id, display_title: movie.title }
    setCurrentPlaybackMedia(mediaObj)
    setPlayerOpen(true)
  }

  const handleAddMovie = (movie) => {
    setSelectedMovie(movie)
    setUploadOpen(true)
  }

  const handleOpenDetails = (movie) => {
    setSelectedMovie(movie)
    setDetailsOpen(true)
  }

  const handleUploadSuccess = (createdMedia) => {
    if (createdMedia && createdMedia.tmdb_id) {
      setAvailabilityMap((prev) => ({
        ...prev,
        [String(createdMedia.tmdb_id)]: createdMedia
      }))
    }
    loadAvailability()
  }

  return (
    <div className="page catalog-page">
      <header className="page-header">
        <div>
          <span className="eyebrow"><Film size={14} /> Catálogo TMDB</span>
          <h1>Catálogo Completo</h1>
          <p>Explora todas las películas de TMDB y consulta su disponibilidad real en el servidor VENUS.</p>
        </div>
        <button className="refresh-button" onClick={() => { loadAvailability(); loadCatalog() }} disabled={state === 'loading'}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </header>

      {/* Toolbar & Filters */}
      <section className="catalog-toolbar panel">
        <div className="catalog-search-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Buscar películas en TMDB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="catalog-filter-group">
          <div className="category-tabs">
            <button
              className={`tab-btn ${category === 'popular' && !searchQuery ? 'tab-btn--active' : ''}`}
              onClick={() => { setCategory('popular'); setSearchQuery('') }}
            >
              Populares
            </button>
            <button
              className={`tab-btn ${category === 'trending' && !searchQuery ? 'tab-btn--active' : ''}`}
              onClick={() => { setCategory('trending'); setSearchQuery('') }}
            >
              En tendencia
            </button>
            <button
              className={`tab-btn ${category === 'top' && !searchQuery ? 'tab-btn--active' : ''}`}
              onClick={() => { setCategory('top'); setSearchQuery('') }}
            >
              Mejor valoradas
            </button>
            <button
              className={`tab-btn ${category === 'upcoming' && !searchQuery ? 'tab-btn--active' : ''}`}
              onClick={() => { setCategory('upcoming'); setSearchQuery('') }}
            >
              Estrenos
            </button>
          </div>

          <select
            className="genre-select"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            <option value="">Todos los géneros</option>
            {TMDB_GENRES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && <div className="alert-message">{error}</div>}

      {/* Movie Grid */}
      {state === 'loading' ? (
        <div className="table-loading">Cargando catálogo TMDB y comprobando disponibilidad...</div>
      ) : movies.length > 0 ? (
        <div className="movie-grid">
          {movies.map((movie) => {
            const media = availabilityMap[String(movie.id)]
            const isAvailable = Boolean(media)
            const posterUrl = getTmdbImageUrl(movie.poster_path)

            return (
              <article key={movie.id} className={`movie-card ${isAvailable ? 'movie-card--available' : ''}`}>
                <div className="poster-container" onClick={() => handleOpenDetails(movie)}>
                  {posterUrl ? (
                    <img src={posterUrl} alt={movie.title} className="movie-poster" loading="lazy" />
                  ) : (
                    <div className="poster-fallback">
                      <Film size={36} />
                      <span>{movie.title}</span>
                    </div>
                  )}

                  <span className={`availability-tag ${isAvailable ? 'tag--available' : 'tag--unavailable'}`}>
                    {isAvailable ? <CheckCircle2 size={12} /> : null}
                    {isAvailable ? 'Disponible' : 'No disponible'}
                  </span>

                  {movie.vote_average && (
                    <span className="rating-badge">
                      <Star size={12} fill="#f8d77a" color="#f8d77a" />
                      {movie.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="movie-card-info">
                  <h3 className="movie-title" title={movie.title} onClick={() => handleOpenDetails(movie)}>
                    {movie.title}
                  </h3>
                  <p className="movie-release">{movie.release_date ? movie.release_date.split('-')[0] : '—'}</p>
                </div>

                <div className="movie-card-actions">
                  {isAvailable ? (
                    <button
                      className="button button--primary card-action-btn"
                      onClick={() => handlePlayMovie(movie, media)}
                    >
                      <Play size={15} /> REPRODUCIR
                    </button>
                  ) : (
                    <button
                      className="button button--secondary card-action-btn"
                      onClick={() => handleAddMovie(movie)}
                    >
                      <Plus size={15} /> AGREGAR
                    </button>
                  )}
                  <button
                    className="icon-button info-action-btn"
                    onClick={() => handleOpenDetails(movie)}
                    title="Ver detalles"
                    aria-label="Ver detalles"
                  >
                    <Info size={16} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="panel empty-catalog-panel">
          <p>No se encontraron películas para los filtros seleccionados.</p>
        </div>
      )}

      {/* Modals */}
      <MovieDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        movie={selectedMovie}
        isAvailable={Boolean(selectedMovie && availabilityMap[String(selectedMovie.id)])}
        media={selectedMovie ? availabilityMap[String(selectedMovie.id)] : null}
        onPlay={(m) => handlePlayMovie(selectedMovie, m)}
        onAdd={(m) => handleAddMovie(m)}
      />

      <UploadMediaModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        tmdbId={selectedMovie?.id}
        movieTitle={selectedMovie?.title}
        posterPath={selectedMovie?.poster_path}
        onSuccess={handleUploadSuccess}
        token={token}
      />

      <VideoPlayerModal
        isOpen={playerOpen}
        onClose={() => setPlayerOpen(false)}
        media={currentPlaybackMedia}
        title={currentPlaybackMedia?.display_title || selectedMovie?.title}
      />
    </div>
  )
}
