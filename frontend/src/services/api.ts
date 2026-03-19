import axios from 'axios'
import type {
  Cryptocurrency,
  PriceHistory,
  PriceAlert,
  DashboardStats,
  PaginatedResponse,
  CreateAlertData,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const ALERT_CLIENT_STORAGE_KEY = 'crypto-monitor.alert-client-token'

interface RequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
}

interface CryptoListParams {
  active?: boolean
  search?: string
}

interface AlertListParams {
  crypto?: number
  triggered?: boolean
  active?: boolean
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

function createAlertClientToken() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 18)}`
}

function getAlertClientToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  const existing = window.localStorage.getItem(ALERT_CLIENT_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const token = createAlertClientToken()
  window.localStorage.setItem(ALERT_CLIENT_STORAGE_KEY, token)
  return token
}

function getAlertClientHeaders() {
  return {
    'X-Alert-Client-Token': getAlertClientToken(),
  }
}

export function isApiRequestCanceled(error: unknown) {
  return axios.isCancel(error) || (axios.isAxiosError(error) && error.code === 'ERR_CANCELED')
}

async function getAllPages<T, P extends object>(
  path: string,
  params?: P,
  options?: RequestOptions
) {
  const results: T[] = []

  for (let page = 1; ; page += 1) {
    const response = await api.get<PaginatedResponse<T>>(path, {
      params: { ...params, page },
      signal: options?.signal,
      headers: options?.headers,
    })

    results.push(...response.data.results)

    if (!response.data.next) {
      return results
    }
  }
}

export const cryptoApi = {
  list: (params?: CryptoListParams, options?: RequestOptions) =>
    getAllPages<Cryptocurrency, CryptoListParams>('/cryptos/', params, options),

  get: async (id: number, options?: RequestOptions) =>
    (await api.get<Cryptocurrency>(`/cryptos/${id}/`, { signal: options?.signal })).data,

  refresh: async (id: number) =>
    (await api.post<{ message: string; task_id: string }>(`/cryptos/${id}/refresh/`)).data,

  getHistory: async (id: number, hours: number = 24, options?: RequestOptions) =>
    (await api.get<PriceHistory[]>(`/cryptos/${id}/history/`, {
      params: { hours },
      signal: options?.signal,
    })).data,
}

export const alertApi = {
  list: (params?: AlertListParams, options?: RequestOptions) =>
    getAllPages<PriceAlert, AlertListParams>('/alerts/', params, {
      signal: options?.signal,
      headers: getAlertClientHeaders(),
    }),

  create: async (data: CreateAlertData) =>
    (await api.post<PriceAlert>('/alerts/', data, {
      headers: getAlertClientHeaders(),
    })).data,

  delete: async (id: number) => {
    await api.delete(`/alerts/${id}/`, {
      headers: getAlertClientHeaders(),
    })
  },

  reset: async (id: number) =>
    (await api.post<PriceAlert>(`/alerts/${id}/reset/`, undefined, {
      headers: getAlertClientHeaders(),
    })).data,
}

export const dashboardApi = {
  getStats: async (options?: RequestOptions) =>
    (await api.get<DashboardStats>('/dashboard/', {
      headers: getAlertClientHeaders(),
      signal: options?.signal,
    })).data,

  triggerFetch: async () =>
    (await api.post<{ message: string; task_id: string }>('/fetch/')).data,
}

export default api
