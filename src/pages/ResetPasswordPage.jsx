import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { completePasswordReset } from '../services/api'

export function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setState('loading')
    setMessage('')
    try {
      const response = await completePasswordReset(token, newPassword, confirmation)
      setState('success')
      setMessage(response.message)
      setNewPassword('')
      setConfirmation('')
    } catch (error) {
      setState('error')
      setMessage(error.message)
    }
  }

  return <main className="login-page"><div className="login-glow login-glow--one" /><section className="login-card"><span className="eyebrow"><KeyRound size={14} /> Seguridad de cuenta</span><div className="login-card__intro"><h1>Restablecer contraseña</h1><p>Define una nueva contraseña para tu cuenta de VENUS.</p></div>{state === 'success' ? <p className="form-message">{message}</p> : <form className="form-stack" onSubmit={handleSubmit}><label>Nueva contraseña<div className="input-wrap"><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={6} /></div></label><label>Confirmar contraseña<div className="input-wrap"><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={6} /></div></label><button className="button button--primary button--large" disabled={state === 'loading' || !token}>{state === 'loading' ? 'Guardando...' : 'Guardar contraseña'}</button>{message && <p className="form-message">{message}</p>}</form>}</section></main>
}
