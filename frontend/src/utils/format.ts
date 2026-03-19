import type { LatestPrice } from '../types'

export function parseNumericValue(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatPrice(
  value: number,
  currency: 'USD' | 'BRL' = 'USD',
  compact: boolean = false
): string {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US'

  if (compact && value >= 1000) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value)
  }

  if (value > 0 && value < 0.01) {
    return value.toFixed(8)
  }

  if (value < 1) {
    return value.toFixed(4)
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function hasReliableBrlPrice(price: LatestPrice | null | undefined): price is LatestPrice & {
  price_brl: string
} {
  return Boolean(price?.price_brl) && !price?.is_brl_estimated
}

export function formatLatestUsdPrice(price: LatestPrice | null | undefined): string {
  if (!price) {
    return '-'
  }

  const numericPrice = parseNumericValue(price.price_usd)
  if (numericPrice === null) {
    return '-'
  }

  return `$${formatPrice(numericPrice)}`
}

export function formatLatestBrlPrice(
  price: LatestPrice | null | undefined,
  unavailableLabel: string = 'BRL indisponível'
): string {
  if (!hasReliableBrlPrice(price)) {
    return unavailableLabel
  }

  const numericPrice = parseNumericValue(price.price_brl)
  if (numericPrice === null) {
    return unavailableLabel
  }

  return `R$ ${formatPrice(numericPrice, 'BRL')}`
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}min atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays < 7) return `${diffDays}d atrás`

  return target.toLocaleDateString('pt-BR')
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
