import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-amber-400" />
      <h1 className="text-2xl font-bold text-white">Página não encontrada</h1>
      <p className="mt-2 text-slate-400">
        A rota informada não existe ou não está disponível.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-crypto-primary px-4 py-2 text-white transition-colors hover:bg-crypto-primary/90"
      >
        Voltar ao dashboard
      </Link>
    </div>
  )
}
