import { useState } from 'react'
import { X } from 'lucide-react'
import type { Cryptocurrency, CreateAlertData } from '../types'
import { formatPrice } from '../utils/format'

interface AlertFormProps {
  cryptos: Cryptocurrency[]
  selectedCrypto?: Cryptocurrency
  onSubmit: (data: CreateAlertData) => Promise<void>
  onClose: () => void
}

export default function AlertForm({
  cryptos,
  selectedCrypto,
  onSubmit,
  onClose,
}: AlertFormProps) {
  const [cryptoId, setCryptoId] = useState(selectedCrypto?.id || cryptos[0]?.id || 0)
  const [targetPrice, setTargetPrice] = useState('')
  const [condition, setCondition] = useState<'above' | 'below'>('above')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedCryptoData = cryptos.find((c) => c.id === cryptoId)
  const currentPrice = selectedCryptoData?.latest_price?.price_usd

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!cryptoId || !targetPrice) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    setIsLoading(true)

    try {
      await onSubmit({
        cryptocurrency: cryptoId,
        target_price: targetPrice,
        condition,
        note,
      })
      onClose()
    } catch (err) {
      setError('Erro ao criar alerta. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-crypto-dark rounded-xl border border-slate-800 w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Criar Alerta</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Cryptocurrency Select */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Criptomoeda
            </label>
            <select
              value={cryptoId}
              onChange={(e) => setCryptoId(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-crypto-primary"
            >
              {cryptos.map((crypto) => (
                <option key={crypto.id} value={crypto.id}>
                  {crypto.symbol} - {crypto.name}
                </option>
              ))}
            </select>
            {currentPrice && (
              <p className="mt-1 text-xs text-slate-500">
                Preço atual: ${formatPrice(parseFloat(currentPrice))}
              </p>
            )}
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Condição
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCondition('above')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  condition === 'above'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                Acima de
              </button>
              <button
                type="button"
                onClick={() => setCondition('below')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  condition === 'below'
                    ? 'bg-red-500/20 text-red-400 border border-red-500'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                Abaixo de
              </button>
            </div>
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Preço Alvo (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                $
              </span>
              <input
                type="number"
                step="any"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-crypto-primary"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Comprar quando atingir esse preço"
              rows={2}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-crypto-primary resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg gradient-primary text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? 'Criando...' : 'Criar Alerta'}
          </button>
        </form>
      </div>
    </div>
  )
}
