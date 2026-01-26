/**
 * Formatting utilities for the Crypto Monitor application.
 */

/**
 * Format a number as currency.
 */
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

  // For very small values (like some altcoins)
  if (value < 0.01 && value > 0) {
    return value.toFixed(8)
  }

  // For small values
  if (value < 1) {
    return value.toFixed(4)
  }

  // For regular values
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/**
 * Format a large number with abbreviation.
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format a date relative to now.
 */
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

/**
 * Format a date/time string.
 */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
