import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'
import type { Cryptocurrency } from '../types'
import { formatPrice, formatPercent } from '../utils/format'

interface CryptoCardProps {
  crypto: Cryptocurrency
  onClick?: () => void
}

export default function CryptoCard({ crypto, onClick }: CryptoCardProps) {
  const price = crypto.latest_price
  const change24h = price?.change_24h ? parseFloat(price.change_24h) : null

  const isPositive = change24h !== null && change24h > 0
  const isNegative = change24h !== null && change24h < 0

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-crypto-dark rounded-xl p-4 border border-slate-800',
        'card-hover cursor-pointer',
        'animate-fade-in'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {crypto.image_url ? (
            <img
              src={crypto.image_url}
              alt={crypto.name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-400">
                {crypto.symbol.slice(0, 2)}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-white">{crypto.symbol}</h3>
            <p className="text-sm text-slate-400">{crypto.name}</p>
          </div>
        </div>

        {change24h !== null && (
          <div
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
              isPositive && 'bg-emerald-500/20 text-emerald-400',
              isNegative && 'bg-red-500/20 text-red-400',
              !isPositive && !isNegative && 'bg-slate-700 text-slate-400'
            )}
          >
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
            {formatPercent(change24h)}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-white">
          {price ? formatPrice(parseFloat(price.price_usd)) : '-'}
        </p>
        <p className="text-sm text-slate-400">
          {price ? `R$ ${formatPrice(parseFloat(price.price_brl), 'BRL')}` : '-'}
        </p>
      </div>
    </div>
  )
}
