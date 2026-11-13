import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Film,
  KeyRound,
  Lock,
  MessageSquare,
  Play,
  PlusCircle,
  RefreshCw,
  Send,
  Share2,
  Tv,
  UserCheck,
  Users,
  Volume2
} from 'lucide-react'
import { VideoPlayerModal } from '../components/VideoPlayerModal'
import { useAuth } from '../context/AuthContext'
import { getMediaLibrary, getStreamUrl } from '../services/api'
import { fetchMovieDetails, getTmdbImageUrl } from '../services/tmdb'

export function WatchPartyPage() {
  const { user, token } = useAuth()
  const [library, setLibrary] = useState([])
  const [activeRoom, setActiveRoom] = useState(null) // { roomCode, isHost, media, passcode }
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [passcodeInput, setPasscodeInput] = useState('')
  const [selectedMediaId, setSelectedMediaId] = useState('')
  const [createPasscode, setCreatePasscode] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('join') // 'join' or 'create'

  // Chat & Participants
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [participants, setParticipants] = useState([])

  // Player state
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [tmdbDetails, setTmdbDetails] = useState(null)
  const [videoLoading, setVideoLoading] = useState(true)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    setVideoLoading(true)
    setVideoError(false)
  }, [activeRoom])

  // Load available library movies for Watch Party creation
  useEffect(() => {
    getMediaLibrary(token)
      .then((data) => {
        const cataloged = data.cataloged || []
        const independent = data.independent || []
        setLibrary([...cataloged, ...independent])
        if (cataloged.length > 0) {
          setSelectedMediaId(cataloged[0].id)
        }
      })
      .catch((e) => console.warn('Watch Party library error:', e.message))
  }, [token])

  // Fetch TMDB meta for current room media if available
  useEffect(() => {
    if (activeRoom?.media?.tmdb_id) {
      fetchMovieDetails(activeRoom.media.tmdb_id).then(setTmdbDetails)
    } else {
      setTmdbDetails(null)
    }
  }, [activeRoom])

  // Mock initial participant list on room join
  useEffect(() => {
    if (activeRoom) {
      setParticipants([
        { id: user?.id || '1', name: user?.name || user?.username || 'Tú (Host)', isHost: activeRoom.isHost },
        { id: '2', name: 'Carlos_Dev', isHost: false },
        { id: '3', name: 'Maria_G', isHost: false }
      ])
      setMessages([
        { id: '1', user: 'Sistema', text: `¡Bienvenidos a la Watch Party ${activeRoom.roomCode}!`, isSystem: true },
        { id: '2', user: 'Carlos_Dev', text: '¡Hola a todos! Listos para ver la peli 🍿', isSystem: false }
      ])
    }
  }, [activeRoom, user])

  const handleCreateRoom = (e) => {
    e.preventDefault()
    if (!selectedMediaId) {
      setError('Selecciona un video disponible de la biblioteca.')
      return
    }

    const selectedMedia = library.find((m) => String(m.id) === String(selectedMediaId))
    const randomCode = `VP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    setActiveRoom({
      roomCode: randomCode,
      isHost: true,
      media: selectedMedia,
      passcode: createPasscode
    })
    setError('')
  }

  const handleJoinRoom = (e) => {
    e.preventDefault()
    const code = roomCodeInput.trim().toUpperCase()
    if (!code) {
      setError('Ingresa un código de sala válido.')
      return
    }

    // Default to first media in library or demo media
    const demoMedia = library[0] || { id: 'demo', display_title: 'Película en Vivo' }

    setActiveRoom({
      roomCode: code,
      isHost: false,
      media: demoMedia,
      passcode: passcodeInput
    })
    setError('')
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const newMsg = {
      id: String(Date.now()),
      user: user?.name || user?.username || 'Tú',
      text: chatInput.trim(),
      isSystem: false
    }

    setMessages((prev) => [...prev, newMsg])
    setChatInput('')
  }

  const handleLeaveRoom = () => {
    setActiveRoom(null)
    setMessages([])
    setParticipants([])
  }

  if (activeRoom) {
    const streamUrl = activeRoom?.media?.id ? getStreamUrl(activeRoom.media.id, token) : ''
    const displayTitle = activeRoom.media.display_title || tmdbDetails?.title || activeRoom.media.file_name || 'Película Watch Party'
    const posterUrl = tmdbDetails ? getTmdbImageUrl(tmdbDetails.poster_path) : null

    return (
      <div className="page watchparty-active-page">
        <header className="page-header watchparty-header">
          <div>
            <span className="eyebrow"><Tv size={14} /> Sala Activa #{activeRoom.roomCode}</span>
            <h1>{displayTitle}</h1>
            <p>
              {activeRoom.isHost ? 'Eres el anfitrión de esta sala. Controlas la reproducción.' : 'Participando en sala sincronizada.'}
            </p>
          </div>
          <button className="button button--danger" onClick={handleLeaveRoom}>
            Salir de la sala
          </button>
        </header>

        <div className="watchparty-room-grid">
          {/* Main Player */}
          <div className="watchparty-main-col">
            <div className="player-wrapper watchparty-player-wrap">
              {videoLoading && !videoError && (
                <div className="player-overlay loading-overlay">
                  <span className="loading-spinner" />
                  <p>Cargando transmisión de la Watch Party...</p>
                </div>
              )}

              {videoError && (
                <div className="player-overlay error-overlay">
                  <AlertCircle size={42} className="text-danger" />
                  <h4>No se pudo reproducir el video en la sala</h4>
                  <p>Verifica que el servidor esté disponible y que el archivo multimedia exista.</p>
                  <button className="button button--primary" onClick={() => { setVideoError(false); setVideoLoading(true); if (videoRef.current) videoRef.current.load(); }}>
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
                onCanPlay={() => setVideoLoading(false)}
                onPlay={() => { setVideoLoading(false); setIsPlaying(true); }}
                onPause={() => setIsPlaying(false)}
                onError={() => {
                  setVideoLoading(false)
                  setVideoError(true)
                }}
              >
                Tu navegador no soporta streaming.
              </video>
            </div>

            <div className="panel room-meta-panel">
              <div className="room-meta-info">
                <strong>Código de Sala: <code className="code-badge">{activeRoom.roomCode}</code></strong>
                <small className="text-muted">Comparte este código para ver la película juntos.</small>
              </div>
              <button
                className="button button--ghost"
                onClick={() => {
                  navigator.clipboard.writeText(activeRoom.roomCode)
                  alert('¡Código copiado al portapapeles!')
                }}
              >
                <Share2 size={16} /> Copiar Código
              </button>
            </div>
          </div>

          {/* Sidebar: Participants & Live Chat */}
          <div className="watchparty-sidebar-col">
            {/* Participants list */}
            <div className="panel participants-panel">
              <div className="panel__header">
                <div>
                  <h2><Users size={16} /> Participantes ({participants.length})</h2>
                </div>
              </div>
              <div className="participants-list">
                {participants.map((p) => (
                  <div key={p.id} className="participant-item">
                    <span className="user-avatar user-avatar--small">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="participant-name">{p.name}</span>
                    {p.isHost && <span className="badge badge--purple">Anfitrión</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Box */}
            <div className="panel chat-panel">
              <div className="panel__header">
                <h2><MessageSquare size={16} /> Chat en Vivo</h2>
              </div>
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`chat-bubble ${msg.isSystem ? 'chat-bubble--system' : ''}`}>
                    {!msg.isSystem && <strong>{msg.user}: </strong>}
                    <span>{msg.text}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="chat-form">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Escribe un mensaje..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="button button--primary chat-send-btn">
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page watchparty-lobby-page">
      <header className="page-header">
        <div>
          <span className="eyebrow"><Tv size={14} /> Cine Sincronizado</span>
          <h1>Watch Party VENUS</h1>
          <p>Disfruta de películas y series en tiempo real con amigos y otros usuarios de VENUS.</p>
        </div>
      </header>

      {error && <div className="alert-message">{error}</div>}

      <div className="watchparty-lobby-container">
        {/* Navigation Tabs */}
        <div className="category-tabs lobby-tabs">
          <button
            className={`tab-btn ${tab === 'join' ? 'tab-btn--active' : ''}`}
            onClick={() => setTab('join')}
          >
            Unirse a una Sala
          </button>
          <button
            className={`tab-btn ${tab === 'create' ? 'tab-btn--active' : ''}`}
            onClick={() => setTab('create')}
          >
            Crear Nueva Sala
          </button>
        </div>

        {tab === 'join' ? (
          <div className="panel lobby-panel">
            <div className="panel__header">
              <div>
                <h2>Ingresar Código de Sala</h2>
                <p>Escribe el código proporcionado por el anfitrión para unirte a la transmisión.</p>
              </div>
            </div>

            <form onSubmit={handleJoinRoom} className="lobby-form">
              <div className="form-group">
                <label htmlFor="room-code-input">Código de Sala (ej. VP-A8K2)</label>
                <div className="input-with-icon">
                  <KeyRound size={18} className="input-icon" />
                  <input
                    id="room-code-input"
                    type="text"
                    className="form-input text-uppercase"
                    placeholder="VP-XXXX"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="passcode-input">Contraseña de Sala (Opcional)</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="passcode-input"
                    type="password"
                    className="form-input"
                    placeholder="Dejar en blanco si no tiene clave"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="button button--primary button--lg lobby-submit-btn">
                <Tv size={18} /> Entrar a la Sala
              </button>
            </form>
          </div>
        ) : (
          <div className="panel lobby-panel">
            <div className="panel__header">
              <div>
                <h2>Crear una Watch Party</h2>
                <p>Selecciona una película disponible en el servidor y genera tu sala de proyección.</p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="lobby-form">
              <div className="form-group">
                <label htmlFor="select-media">Selecciona la Película</label>
                <select
                  id="select-media"
                  className="form-input"
                  value={selectedMediaId}
                  onChange={(e) => setSelectedMediaId(e.target.value)}
                >
                  {library.length > 0 ? (
                    library.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_title || m.file_name || `Película #${m.id}`} ({m.file_format?.toUpperCase() || 'VIDEO'})
                      </option>
                    ))
                  ) : (
                    <option value="">No hay películas disponibles en el servidor</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="create-passcode">Contraseña de acceso (Opcional)</label>
                <input
                  id="create-passcode"
                  type="password"
                  className="form-input"
                  placeholder="Opcional: protege tu sala con clave"
                  value={createPasscode}
                  onChange={(e) => setCreatePasscode(e.target.value)}
                />
              </div>

              <button type="submit" className="button button--primary button--lg lobby-submit-btn" disabled={!library.length}>
                <PlusCircle size={18} /> Iniciar Watch Party
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
