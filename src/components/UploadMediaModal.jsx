import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileVideo,
  Film,
  HardDrive,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X
} from 'lucide-react'
import { getImportableFiles, importServerMedia, uploadMediaFile } from '../services/api'
import { getTmdbImageUrl, searchTmdbMovies } from '../services/tmdb'

export function UploadMediaModal({ isOpen, onClose, tmdbId, movieTitle, posterPath, onSuccess, token }) {
  // Main tab state: 'upload' or 'server_import'
  const [activeTab, setActiveTab] = useState('upload')

  // --- TAB 1: UPLOAD STATE ---
  const [file, setFile] = useState(null)
  const [displayTitle, setDisplayTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // --- TAB 2: SERVER IMPORT STATE ---
  const [serverFiles, setServerFiles] = useState([])
  const [importDirName, setImportDirName] = useState('uploads/import')
  const [loadingServerFiles, setLoadingServerFiles] = useState(false)
  const [serverFilesError, setServerFilesError] = useState('')
  const [fileSearchQuery, setFileSearchQuery] = useState('')
  const [selectedFileIds, setSelectedFileIds] = useState(new Set())

  // TMDB Association & Custom Metadata per selected file
  const [customMetadata, setCustomMetadata] = useState({}) // { [fileId]: { tmdbId, mediaType, displayTitle } }
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('')
  const [tmdbSearchResults, setTmdbSearchResults] = useState([])
  const [searchingTmdb, setSearchingTmdb] = useState(false)

  // Import Action & Results State
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)

  const isPresetMovie = Boolean(tmdbId && String(tmdbId).trim() !== '')
  const presetImageUrl = getTmdbImageUrl(posterPath)

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab('upload')
      setFile(null)
      setDisplayTitle(movieTitle || '')
      setUploading(false)
      setUploadProgress(0)
      setUploadError('')
      setUploadSuccess(false)

      setServerFiles([])
      setSelectedFileIds(new Set())
      setCustomMetadata({})
      setFileSearchQuery('')
      setTmdbSearchQuery('')
      setTmdbSearchResults([])
      setImportResults(null)

      if (token) {
        fetchServerFiles()
      }
    }
  }, [isOpen, movieTitle, token])

  // Fetch list of scanned video files on the server
  const fetchServerFiles = useCallback(async () => {
    setLoadingServerFiles(true)
    setServerFilesError('')
    try {
      const response = await getImportableFiles(token)
      setServerFiles(response.files || [])
      if (response.importDir) setImportDirName(response.importDir)
    } catch (err) {
      setServerFilesError(err.message || 'No se pudo obtener la lista de archivos del servidor.')
    } finally {
      setLoadingServerFiles(false)
    }
  }, [token])

  useEffect(() => {
    if (isOpen && activeTab === 'server_import' && token) {
      fetchServerFiles()
    }
  }, [isOpen, activeTab, token, fetchServerFiles])

  if (!isOpen) return null

  // --- HANDLERS: TAB 1 (UPLOAD) ---
  function handleFileChange(event) {
    const selected = event.target.files?.[0]
    if (selected) {
      setFile(selected)
      setUploadError('')
      if (!displayTitle && selected.name) {
        setDisplayTitle(selected.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  async function handleUploadSubmit(event) {
    event.preventDefault()
    if (!file) {
      setUploadError('Selecciona un archivo de video para subir.')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadError('')

    try {
      const response = await uploadMediaFile(
        token,
        {
          file,
          tmdbId: isPresetMovie ? String(tmdbId) : null,
          mediaType: isPresetMovie ? 'movie' : 'independent',
          displayTitle: displayTitle.trim() || movieTitle || file.name
        },
        (percent) => setUploadProgress(percent)
      )

      setUploading(false)
      setUploadSuccess(true)
      setTimeout(() => {
        if (onSuccess) onSuccess(response.media)
        onClose()
      }, 1200)
    } catch (err) {
      setUploading(false)
      setUploadError(err.message || 'Error al subir el archivo al servidor.')
    }
  }

  // --- HANDLERS: TAB 2 (SERVER IMPORT) ---
  function toggleFileSelection(fileId) {
    setSelectedFileIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }

  function toggleSelectAll(filteredFiles) {
    const selectableFiles = filteredFiles.filter((f) => !f.isRegistered)
    const allSelected = selectableFiles.every((f) => selectedFileIds.has(f.fileId))

    setSelectedFileIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        selectableFiles.forEach((f) => next.delete(f.fileId))
      } else {
        selectableFiles.forEach((f) => next.add(f.fileId))
      }
      return next
    })
  }

  // Handle TMDB search for associating custom TMDB metadata to a selected file
  async function handleTmdbSearch(e) {
    e.preventDefault()
    if (!tmdbSearchQuery.trim()) return

    setSearchingTmdb(true)
    try {
      const results = await searchTmdbMovies(tmdbSearchQuery)
      setTmdbSearchResults(results || [])
    } catch (err) {
      console.warn('Error al buscar en TMDB:', err)
    } finally {
      setSearchingTmdb(false)
    }
  }

  function associateTmdbToFiles(targetMovie) {
    if (!selectedFileIds.size) return

    setCustomMetadata((prev) => {
      const next = { ...prev }
      selectedFileIds.forEach((fileId) => {
        next[fileId] = {
          tmdbId: String(targetMovie.id),
          mediaType: 'movie',
          displayTitle: targetMovie.title
        }
      })
      return next
    })
    setTmdbSearchResults([])
    setTmdbSearchQuery('')
  }

  function clearTmdbAssociation(fileId) {
    setCustomMetadata((prev) => {
      const next = { ...prev }
      delete next[fileId]
      return next
    })
  }

  async function handleServerImportSubmit() {
    if (!selectedFileIds.size) return

    setImporting(true)
    setImportResults(null)

    const itemsToImport = Array.from(selectedFileIds).map((fileId) => {
      const targetFile = serverFiles.find((f) => f.fileId === fileId)
      const meta = customMetadata[fileId] || {}

      let finalTmdbId = meta.tmdbId
      let finalMediaType = meta.mediaType
      let finalDisplayTitle = meta.displayTitle

      // If opening modal for a specific movie in Catalog page
      if (isPresetMovie) {
        finalTmdbId = String(tmdbId)
        finalMediaType = 'movie'
        finalDisplayTitle = movieTitle || targetFile?.fileName
      }

      if (!finalDisplayTitle && targetFile) {
        finalDisplayTitle = targetFile.fileName.replace(/\.[^/.]+$/, '')
      }

      return {
        fileId,
        tmdbId: finalTmdbId || null,
        mediaType: finalMediaType || (finalTmdbId ? 'movie' : 'independent'),
        displayTitle: finalDisplayTitle
      }
    })

    try {
      const response = await importServerMedia(token, itemsToImport)
      setImportResults(response.results || [])
      fetchServerFiles()

      const anySuccess = response.results?.some((r) => r.success)
      if (anySuccess && onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setServerFilesError(err.message || 'Error al ejecutar la importación de archivos.')
    } finally {
      setImporting(false)
    }
  }

  // Filter scanned files by search query
  const filteredServerFiles = serverFiles.filter((f) => {
    if (!fileSearchQuery.trim()) return true
    const q = fileSearchQuery.toLowerCase()
    return f.fileName.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q)
  })

  const selectableFiles = filteredServerFiles.filter((f) => !f.isRegistered)
  const isAllSelected = selectableFiles.length > 0 && selectableFiles.every((f) => selectedFileIds.has(f.fileId))

  function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '0 MB'
    const mb = bytes / (1024 * 1024)
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div className="upload-modal-backdrop" role="dialog" aria-modal="true">
      <div className="upload-modal-container upload-modal-container--wide">
        {/* Header */}
        <header className="upload-modal-header">
          <div>
            <span className="eyebrow">Biblioteca VENUS</span>
            <h3>
              {isPresetMovie
                ? `Agregar película: ${movieTitle}`
                : 'Agregar contenido a la biblioteca'}
            </h3>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={uploading || importing}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </header>

        {/* Preset Movie Banner if opened from Catalog card */}
        {presetImageUrl && (
          <div className="upload-movie-preview">
            <img src={presetImageUrl} alt={movieTitle} className="upload-preview-poster" />
            <div>
              <strong>{movieTitle}</strong>
              <small className="text-muted">TMDB ID: #{tmdbId}</small>
            </div>
          </div>
        )}

        {/* Mode Selector / Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab-btn ${activeTab === 'upload' ? 'modal-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('upload')}
            disabled={uploading || importing}
          >
            <Upload size={16} /> Subir desde navegador
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'server_import' ? 'modal-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('server_import')}
            disabled={uploading || importing}
          >
            <HardDrive size={16} /> Importar desde servidor
          </button>
        </div>

        {/* --- TAB 1: SUBIR PELÍCULA DESDE EL NAVEGADOR --- */}
        {activeTab === 'upload' && (
          <div className="tab-content">
            {uploadError && (
              <div className="alert-message alert-message--error">
                <AlertTriangle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="alert-message alert-message--success">
                <CheckCircle2 size={16} />
                <span>¡Archivo subido y registrado exitosamente en VENUS!</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="upload-form">
              <div className="form-group">
                <label htmlFor="upload-display-title">Título o nombre visible</label>
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
                <label>Archivo de video (.mp4, .mkv, .webm, .avi, .mov)</label>
                <div className={`file-dropzone ${file ? 'file-dropzone--active' : ''}`}>
                  <FileVideo size={36} className="dropzone-icon" />
                  {file ? (
                    <div className="selected-file-info">
                      <strong>{file.name}</strong>
                      <small>{formatFileSize(file.size)}</small>
                    </div>
                  ) : (
                    <div className="dropzone-text">
                      <span>Arrastra tu archivo aquí o haz clic para seleccionar</span>
                      <small className="text-muted">Formatos soportados: MP4, MKV, AVI, MOV, WEBM</small>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="video/mp4,video/x-matroska,video/webm,video/avi,video/quicktime,video/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="file-input-overlay"
                  />
                </div>
              </div>

              {uploading && (
                <div className="upload-progress-container">
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <div className="progress-status">
                    <span>Subiendo archivo al servidor...</span>
                    <strong>{uploadProgress}%</strong>
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
                      <span className="loading-dot" /> Subiendo ({uploadProgress}%)
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Subir película
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TAB 2: IMPORTAR DESDE EL SERVIDOR --- */}
        {activeTab === 'server_import' && (
          <div className="tab-content">
            <div className="server-import-info-box">
              <HardDrive size={18} />
              <div>
                <strong>Carpeta del servidor autorizada:</strong>
                <code>{importDirName}</code>
                <p>Copia previamente tus archivos de video a esa carpeta en el servidor para registrarlos al instante sin volver a transferirlos.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={fetchServerFiles}
                disabled={loadingServerFiles}
                title="Actualizar lista de archivos en disco"
              >
                <RefreshCw size={15} className={loadingServerFiles ? 'spin-icon' : ''} />
              </button>
            </div>

            {serverFilesError && (
              <div className="alert-message alert-message--error">
                <AlertTriangle size={16} />
                <span>{serverFilesError}</span>
              </div>
            )}

            {/* Results display after import */}
            {importResults && (
              <div className="import-results-panel">
                <h4>Resultados de la importación</h4>
                <ul className="results-list">
                  {importResults.map((res, index) => (
                    <li key={index} className={`result-item ${res.success ? 'result-item--success' : 'result-item--error'}`}>
                      {res.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <div className="result-info">
                        <strong>{res.fileName || res.fileId}</strong>
                        <span>{res.isDuplicate ? 'El archivo ya estaba registrado en PostgreSQL.' : res.message || 'Importado correctamente en la biblioteca.'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="results-actions">
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => {
                      setImportResults(null)
                      setSelectedFileIds(new Set())
                    }}
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}

            {!importResults && (
              <>
                {/* Search & Selection Toolbar */}
                <div className="server-files-toolbar">
                  <div className="server-files-search">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      className="form-input search-input"
                      placeholder="Filtrar archivos escaneados..."
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                    />
                  </div>
                  {selectableFiles.length > 0 && (
                    <button
                      type="button"
                      className="button button--ghost select-all-btn"
                      onClick={() => toggleSelectAll(filteredServerFiles)}
                    >
                      {isAllSelected ? 'Desmarcar todos' : 'Seleccionar todos'}
                    </button>
                  )}
                </div>

                {/* Scanned Files List */}
                {loadingServerFiles ? (
                  <div className="table-loading">Escaneando archivos de video en el disco del servidor...</div>
                ) : filteredServerFiles.length > 0 ? (
                  <div className="server-files-list">
                    {filteredServerFiles.map((f) => {
                      const isSelected = selectedFileIds.has(f.fileId)
                      const meta = customMetadata[f.fileId]

                      return (
                        <div
                          key={f.fileId}
                          className={`server-file-item ${isSelected ? 'server-file-item--selected' : ''} ${
                            f.isRegistered ? 'server-file-item--registered' : ''
                          }`}
                        >
                          <label className="file-checkbox-label">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={f.isRegistered || importing}
                              onChange={() => toggleFileSelection(f.fileId)}
                            />
                            <span className="checkbox-custom">
                              {isSelected && <Check size={12} />}
                            </span>
                          </label>

                          <div className="file-item-details" onClick={() => !f.isRegistered && toggleFileSelection(f.fileId)}>
                            <div className="file-name-wrap">
                              <FileVideo size={18} className="file-icon" />
                              <strong className="file-name">{f.fileName}</strong>
                              <span className="file-format-badge">{f.fileFormat.toUpperCase()}</span>
                            </div>

                            <div className="file-sub-meta">
                              <small>{formatFileSize(f.fileSize)}</small>
                              <small>·</small>
                              <small>{f.relativePath}</small>
                            </div>

                            {meta?.tmdbId && (
                              <div className="file-tmdb-tag">
                                <Film size={12} />
                                <span>TMDB #{meta.tmdbId}: {meta.displayTitle}</span>
                                <button
                                  type="button"
                                  className="clear-tmdb-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    clearTmdbAssociation(f.fileId)
                                  }}
                                  title="Quitar asociación de TMDB"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="file-item-status">
                            {f.isRegistered ? (
                              <span className="badge badge--registered">
                                <CheckCircle2 size={12} /> Registrado
                              </span>
                            ) : (
                              <span className="badge badge--available">Disponible</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="panel empty-server-files">
                    <FileVideo size={32} />
                    <p>No se encontraron nuevos archivos de video en la carpeta autorizada.</p>
                    <small>Copia tus archivos MP4, MKV o AVI en <code>{importDirName}</code> para importarlos.</small>
                  </div>
                )}

                {/* TMDB Search / Matching Panel (If files are selected and not a preset movie) */}
                {selectedFileIds.size > 0 && !isPresetMovie && (
                  <div className="tmdb-association-box">
                    <div className="tmdb-assoc-header">
                      <Film size={16} />
                      <span>Identificar película en TMDB (opcional)</span>
                    </div>

                    <form onSubmit={handleTmdbSearch} className="tmdb-assoc-form">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Buscar título en TMDB (ej. Interstellar)..."
                        value={tmdbSearchQuery}
                        onChange={(e) => setTmdbSearchQuery(e.target.value)}
                      />
                      <button type="submit" className="button button--secondary" disabled={searchingTmdb}>
                        {searchingTmdb ? 'Buscando...' : 'Buscar TMDB'}
                      </button>
                    </form>

                    {tmdbSearchResults.length > 0 && (
                      <div className="tmdb-search-results">
                        <small className="results-label">Selecciona la película coincidente para los archivos seleccionados:</small>
                        <div className="tmdb-results-grid">
                          {tmdbSearchResults.slice(0, 4).map((m) => {
                            const poster = getTmdbImageUrl(m.poster_path, 'w92')
                            return (
                              <div
                                key={m.id}
                                className="tmdb-result-card"
                                onClick={() => associateTmdbToFiles(m)}
                              >
                                {poster ? (
                                  <img src={poster} alt={m.title} className="tmdb-thumb" />
                                ) : (
                                  <div className="tmdb-thumb-fallback"><Film size={20} /></div>
                                )}
                                <div className="tmdb-result-info">
                                  <strong>{m.title}</strong>
                                  <small>{m.release_date ? m.release_date.split('-')[0] : '—'}</small>
                                </div>
                                <button type="button" className="button button--ghost button--xs">
                                  <Plus size={12} /> Asociar
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Footer */}
                <div className="modal-actions">
                  <button type="button" className="button button--ghost" onClick={onClose} disabled={importing}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={handleServerImportSubmit}
                    disabled={!selectedFileIds.size || importing}
                  >
                    {importing ? (
                      <>
                        <span className="loading-dot" /> Importando...
                      </>
                    ) : (
                      <>
                        <HardDrive size={16} /> Importar {selectedFileIds.size} {selectedFileIds.size === 1 ? 'película' : 'películas'}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
