import type { Cryptocurrency } from '../types'

interface CryptoAvatarProps {
  crypto: Pick<Cryptocurrency, 'image_url' | 'name' | 'symbol'>
  size?: 'sm' | 'lg'
}

export default function CryptoAvatar({ crypto, size = 'sm' }: CryptoAvatarProps) {
  const containerClass = size === 'lg' ? 'h-16 w-16' : 'h-10 w-10'
  const textClass = size === 'lg' ? 'text-2xl' : 'text-sm'

  if (crypto.image_url) {
    return (
      <img
        src={crypto.image_url}
        alt={crypto.name}
        className={`${containerClass} rounded-full`}
      />
    )
  }

  return (
    <div className={`${containerClass} flex items-center justify-center rounded-full bg-slate-700`}>
      <span className={`${textClass} font-bold text-slate-400`}>
        {crypto.symbol.slice(0, 2)}
      </span>
    </div>
  )
}
