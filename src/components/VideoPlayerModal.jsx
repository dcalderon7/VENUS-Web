import React, { useEffect, useRef, useState } from 'react'
import { AlertCircle, Film, Maximize2, Play, Volume2, X } from 'lucide-react'
import { getStreamUrl } from '../services/api'

export function VideoPlayerModal({ isOpen, onClose, media, title, posterPath }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setError(false)
    setLoading(true)
  }, [media])

  if (!isOpen || !media) return null

  const mediaId = media.id || media.tmdb_id || media.tmdbId
  const streamUrl = getStreamUrl(mediaId)
  const displayTitle = title || media.display_title || media.file_name || `Película #${mediaId}`

  function handleFullscreen() {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen()
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen()
      }
    }
  }

  return (
    <div className="player-modal-backdrop" role="dialog" aria-modal="true">
      <div className="player-modal-container">
        <header className="player-modal-header">
          <div className="player-modal-title">
            <Film size={18} className="player-icon" />
            <div>
              <h3>{displayTitle}</h3>
              <span className="player-subtitle">
                {media.media_type === 'independent' ? 'Archivo independiente' : `ID: ${mediaId}`}
                {media.file_format ? ` · ${media.file_format.toUpperCase()}` : ''}
              </span>
            </div>
          </div>
          <button className="icon-button player-close-btn" onClick={onClose} aria-label="Cerrar reproductor">
            <X size={20} />
          </button>
        </header>

        <div className="player-wrapper">
          {loading && !error && (
            <div className="player-overlay loading-overlay">
              <span className="loading-spinner" />
              <p>Cargando flujo de video desde el servidor VENUS...</p>
            </div>
          )}

          {error && (
            <div className="player-overlay error-overlay">
              <AlertCircle size={42} className="text-danger" />
              <h4>No se pudo reproducir este archivo</h4>
              <p>Verifica que el servidor esté encendido y que el formato del video sea compatible con el navegador.</p>
              <button className="button button--primary" onClick={() => setError(false)}>
                Reintentar
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            className="video-element"
            controls
            autoPlay
            preload="metadata"
            src={streamUrl}
            onCanPlay={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setError(true)
            }}
          >
            Tu navegador no soporta la reproducción HTML5 de este video.
          </video>
        </div>

        <footer className="player-modal-footer">
          <div className="player-footer-info">
            <span className="badge badge--purple">Streaming Directo</span>
            {media.file_size && (
              <small className="text-muted">
                {(Number(media.file_size) / 1024 / 1024).toFixed(1)} MB
              </small>
            )}
          </div>
          <button className="button button--ghost" onClick={handleFullscreen}>
            <Maximize2 size={16} /> Pantalla completa
          </button>
        </footer>
      </div>
    </div>
  )
}
