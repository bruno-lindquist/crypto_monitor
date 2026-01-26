/**
 * Type definitions for the Crypto Monitor application.
 */

export interface Cryptocurrency {
  id: number
  symbol: string
  name: string
  coingecko_id: string
  image_url: string | null
  is_active: boolean
  latest_price: LatestPrice | null
}

export interface LatestPrice {
  price_usd: string
  price_brl: string
  change_24h: string | null
  volume_24h_usd: string | null
  collected_at: string
}

export interface PriceHistory {
  id: number
  cryptocurrency: number
  cryptocurrency_symbol: string
  price_usd: string
  price_brl: string
  market_cap_usd: string | null
  volume_24h_usd: string | null
  change_1h: string | null
  change_24h: string | null
  change_7d: string | null
  collected_at: string
}

export interface PriceAlert {
  id: number
  cryptocurrency: number
  cryptocurrency_symbol: string
  cryptocurrency_name: string
  target_price: string
  condition: 'above' | 'below'
  note: string
  is_active: boolean
  is_triggered: boolean
  triggered_price: string | null
  triggered_at: string | null
  current_price: number | null
  distance_percent: number | null
  created_at: string
}

export interface CollectionLog {
  id: number
  started_at: string
  completed_at: string | null
  status: 'success' | 'partial' | 'failed'
  cryptos_processed: number
  cryptos_failed: number
  error_message: string
  execution_time_ms: number | null
}

export interface DashboardStats {
  total_cryptos: number
  active_cryptos: number
  total_alerts: number
  active_alerts: number
  triggered_alerts_24h: number
  last_collection: CollectionLog | null
  top_gainers: Cryptocurrency[]
  top_losers: Cryptocurrency[]
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface CreateAlertData {
  cryptocurrency: number
  target_price: string
  condition: 'above' | 'below'
  note?: string
}
