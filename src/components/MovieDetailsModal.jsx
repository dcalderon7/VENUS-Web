import React from 'react'
import { Calendar, CheckCircle2, Film, PlusCircle, Play, Star, X } from 'lucide-react'
import { TMDB_GENRES, getTmdbImageUrl } from '../services/tmdb'

export function MovieDetailsModal({ isOpen, onClose, movie, isAvailable, media, onPlay, onAdd }) {
  if (!isOpen || !movie) return null

  const backdropUrl = getTmdbImageUrl(movie.backdrop_path, 'w780') || getTmdbImageUrl(movie.poster_path, 'w780')
  const posterUrl = getTmdbImageUrl(movie.poster_path, 'w500')
  const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : '—'
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '—'

  // Resolve genres
  const genres = (movie.genre_ids || [])
    .map((id) => TMDB_GENRES.find((g) => g.id === id)?.name)
    .filter(Boolean)

  return (
    <div className="movie-details-modal-backdrop" role="dialog" aria-modal="true">
      <div className="movie-details-modal">
        <button className="icon-button details-close-btn" onClick={onClose} aria-label="Cerrar modal">
          <X size={20} />
        </button>

        <div
          className="details-hero"
          style={{ backgroundImage: backdropUrl ? `linear-gradient(to bottom, rgba(17, 16, 21, 0.4), #171321), url(${backdropUrl})` : 'none' }}
        >
          <div className="details-hero-content">
            {posterUrl && <img src={posterUrl} alt={movie.title} className="details-poster" />}
            <div className="details-title-area">
              <span className={`status-badge ${isAvailable ? 'status-badge--available' : 'status-badge--unavailable'}`}>
                {isAvailable ? <CheckCircle2 size={14} /> : <Film size={14} />}
                {isAvailable ? 'Disponible en Servidor' : 'No Disponible en Servidor'}
              </span>
              <h2>{movie.title}</h2>
              <div className="details-meta-row">
                <span className="rating-pill">
                  <Star size={14} fill="#f8d77a" color="#f8d77a" /> {rating}
                </span>
                <span className="meta-item">
                  <Calendar size={14} /> {releaseYear}
                </span>
                <span className="meta-item">TMDb #{movie.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="details-body">
          {genres.length > 0 && (
            <div className="genres-list">
              {genres.map((g) => (
                <span key={g} className="genre-tag">
                  {g}
                </span>
              ))}
            </div>
          )}

          <div className="details-synopsis">
            <h4>Sinopsis</h4>
            <p>{movie.overview || 'Sin descripción disponible para este título en TMDB.'}</p>
          </div>

          <div className="details-actions">
            {isAvailable ? (
              <button
                className="button button--primary button--lg"
                onClick={() => {
                  onClose()
                  onPlay(media || { tmdb_id: movie.id, title: movie.title })
                }}
              >
                <Play size={18} /> Reproducir Ahora
              </button>
            ) : (
              <button
                className="button button--secondary button--lg"
                onClick={() => {
                  onClose()
                  onAdd(movie)
                }}
              >
                <PlusCircle size={18} /> Agregar a Servidor
              </button>
            )}
            <button className="button button--ghost" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
