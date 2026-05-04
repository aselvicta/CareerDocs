import { Sparkles } from 'lucide-react'

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="page">
      <div className="loading-state">
        <Sparkles size={32} className="spin-slow" />
        <p>{message}</p>
      </div>
    </div>
  )
}

