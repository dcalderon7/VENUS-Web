import { Database } from 'lucide-react'

export function EmptyState({ title = 'Sin datos disponibles', description = 'Conecta la API para comenzar a visualizar información real.' }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Database size={20} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      <span className="status-pill">Pendiente de conexión</span>
    </div>
  )
}
