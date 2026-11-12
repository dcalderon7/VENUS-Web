import { useEffect, useState } from 'react'
import { ArrowRight, LockKeyhole, Mail, Server } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { apiConfig } from '../services/api'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { status, user, error, signIn, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'admin') {
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    }
  }, [status, user, navigate, location.state])

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    if (!apiConfig.isConfigured) {
      setMessage('Modo visual: configura VITE_API_URL para conectar con el backend.')
      return
    }
    setLoading(true)
    try {
      const currentUser = await signIn(form.identifier, form.password)
      if (currentUser.role !== 'admin') {
        setMessage('Credenciales válidas, pero esta cuenta no tiene rol administrativo confirmado por el servidor.')
      }
    } catch (error) {
      setMessage(error.message === 'Credenciales inválidas.' ? 'El correo/usuario o la contraseña no son correctos.' : error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-glow login-glow--one" />
      <div className="login-glow login-glow--two" />
      <section className="login-card">
        <Brand />
        <div className="login-card__intro">
          <span className="eyebrow">Panel administrativo</span>
          <h1>Bienvenido a <span>VENUS</span></h1>
          <p>Gestiona tu plataforma de streaming desde un solo lugar.</p>
        </div>
        <form onSubmit={handleSubmit} className="form-stack">
          <label>Correo o nombre de usuario
            <div className="input-wrap"><Mail size={18} /><input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="admin@venus.com" required /></div>
          </label>
          <label>Contraseña
            <div className="input-wrap"><LockKeyhole size={18} /><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required /></div>
          </label>
          <button className="button button--primary button--large" disabled={loading}>{loading ? 'Conectando...' : 'Iniciar sesión'} <ArrowRight size={18} /></button>
        </form>
        <div className={`connection-note ${apiConfig.isConfigured ? 'connection-note--ready' : ''}`}><Server size={15} />{apiConfig.isConfigured ? 'API configurada' : 'Vista previa sin conexión'}</div>
        {(message || error) && <p className="form-message">{message || error}</p>}
      </section>
    </main>
  )
}
