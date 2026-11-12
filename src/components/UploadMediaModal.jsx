import React, { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, FileVideo, HardDrive, Upload, X } from 'lucide-react'
import { uploadMediaFile } from '../services/api'
import { getTmdbImageUrl } from '../services/tmdb'

export function UploadMediaModal({ isOpen, onClose, tmdbId, movieTitle, posterPath, onSuccess, token }) {
  const [file, setFile] = useState(null)
  const [displayTitle, setDisplayTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFile(null)
      setDisplayTitle(movieTitle || '')
      setUploading(false)
      setProgress(0)
      setError('')
      setSuccess(false)
    }
  }, [isOpen, movieTitle])

  if (!isOpen) return null

  const isIndependent = !tmdbId || String(tmdbId).trim() === ''
  const imageUrl = getTmdbImageUrl(posterPath)

  function handleFileChange(event) {
    const selected = event.target.files?.[0]
    if (selected) {
      setFile(selected)
      setError('')
      if (!displayTitle && selected.name) {
        setDisplayTitle(selected.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file) {
      setError('Selecciona un archivo de video para subir.')
      return
    }

    setUploading(true)
    setProgress(0)
    setError('')

    try {
      const response = await uploadMediaFile(
        token,
        {
          file,
          tmdbId: isIndependent ? null : String(tmdbId),
          mediaType: isIndependent ? 'independent' : 'movie',
          displayTitle: displayTitle.trim() || movieTitle || file.name
        },
        (percent) => setProgress(percent)
      )

      setUploading(false)
      setSuccess(true)
      setTimeout(() => {
        if (onSuccess) onSuccess(response.media)
        onClose()
      }, 1200)
    } catch (err) {
      setUploading(false)
      setError(err.message || 'Error al subir el archivo al servidor.')
    }
  }

  return (
    <div className="upload-modal-backdrop" role="dialog" aria-modal="true">
      <div className="upload-modal-container">
        <header className="upload-modal-header">
          <div>
            <span className="eyebrow">Cargar multimedia</span>
            <h3>{isIndependent ? 'Agregar archivo independiente' : `Agregar a servidor: ${movieTitle}`}</h3>
          </div>
          <button className="icon-button" onClick={onClose} disabled={uploading} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </header>

        {imageUrl && (
          <div className="upload-movie-preview">
            <img src={imageUrl} alt={movieTitle} className="upload-preview-poster" />
            <div>
              <strong>{movieTitle}</strong>
              <small className="text-muted">TMDB ID: #{tmdbId}</small>
            </div>
          </div>
        )}

        {error && (
          <div className="alert-message">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-message alert-message--success">
            <CheckCircle size={16} />
            <span>¡Archivo subido y asociado correctamente en VENUS!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label htmlFor="upload-display-title">Título o nombre mostrado</label>
            <input
              id="upload-display-title"
              type="text"
              className="form-input"
              value={displayTitle}
              onChange={(e) => setDisplayTitle(e.target.value)}
              placeholder="Ej. El Caballero de la Noche (1080p)"
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label>Archivo de video (.mp4, .mkv, .webm, .avi)</label>
            <div className={`file-dropzone ${file ? 'file-dropzone--active' : ''}`}>
              <FileVideo size={36} className="dropzone-icon" />
              {file ? (
                <div className="selected-file-info">
                  <strong>{file.name}</strong>
                  <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                </div>
              ) : (
                <div className="dropzone-text">
                  <span>Arrastra tu archivo aquí o haz clic para examinar</span>
                  <small className="text-muted">Archivos de video hasta 10GB</small>
                </div>
              )}
              <input
                type="file"
                accept="video/mp4,video/x-matroska,video/webm,video/avi,video/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="file-input-overlay"
              />
            </div>
          </div>

          {uploading && (
            <div className="upload-progress-container">
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="progress-status">
                <span>Subiendo archivo al servidor VENUS...</span>
                <strong>{progress}%</strong>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="button button--ghost" onClick={onClose} disabled={uploading}>
              Cancelar
            </button>
            <button type="submit" className="button button--primary" disabled={!file || uploading}>
              {uploading ? (
                <>
                  <span className="loading-dot" /> Subiendo ({progress}%)
                </>
              ) : (
                <>
                  <Upload size={16} /> Subir al servidor
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
