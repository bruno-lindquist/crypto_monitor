import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClass} animate-spin text-crypto-primary`} />
      {text && <p className="text-sm text-slate-400">{text}</p>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Carregando..." />
    </div>
  )
}
