import { Sparkles } from 'lucide-react'

export function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand__mark"><Sparkles size={18} strokeWidth={2.5} /></span>
      {!compact && <span>VENUS</span>}
    </div>
  )
}
