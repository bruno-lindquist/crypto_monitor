/**
 * API service for the Crypto Monitor application.
 * Handles all HTTP requests to the backend.
 */

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

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

function createAlertClientToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 18)}`
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

/**
 * Cryptocurrency endpoints
 */
export const cryptoApi = {
  list: async (params?: { active?: boolean; search?: string }) => {
    const response = await api.get<PaginatedResponse<Cryptocurrency>>('/cryptos/', { params })
    return response.data
  },

  get: async (id: number) => {
    const response = await api.get<Cryptocurrency>(`/cryptos/${id}/`)
    return response.data
  },

  create: async (data: Partial<Cryptocurrency>) => {
    const response = await api.post<Cryptocurrency>('/cryptos/', data)
    return response.data
  },

  update: async (id: number, data: Partial<Cryptocurrency>) => {
    const response = await api.patch<Cryptocurrency>(`/cryptos/${id}/`, data)
    return response.data
  },

  delete: async (id: number) => {
    await api.delete(`/cryptos/${id}/`)
  },

  refresh: async (id: number) => {
    const response = await api.post<{ message: string; task_id: string }>(
      `/cryptos/${id}/refresh/`
    )
    return response.data
  },

  getHistory: async (id: number, hours: number = 24) => {
    const response = await api.get<PriceHistory[]>(`/cryptos/${id}/history/`, {
      params: { hours },
    })
    return response.data
  },
}

/**
 * Alert endpoints
 */
export const alertApi = {
  list: async (params?: { crypto?: number; triggered?: boolean; active?: boolean }) => {
    const response = await api.get<PaginatedResponse<PriceAlert>>('/alerts/', {
      params,
      headers: getAlertClientHeaders(),
    })
    return response.data
  },

  get: async (id: number) => {
    const response = await api.get<PriceAlert>(`/alerts/${id}/`, {
      headers: getAlertClientHeaders(),
    })
    return response.data
  },

  create: async (data: CreateAlertData) => {
    const response = await api.post<PriceAlert>('/alerts/', data, {
      headers: getAlertClientHeaders(),
    })
    return response.data
  },

  update: async (id: number, data: Partial<CreateAlertData>) => {
    const response = await api.patch<PriceAlert>(`/alerts/${id}/`, data, {
      headers: getAlertClientHeaders(),
    })
    return response.data
  },

  delete: async (id: number) => {
    await api.delete(`/alerts/${id}/`, {
      headers: getAlertClientHeaders(),
    })
  },

  reset: async (id: number) => {
    const response = await api.post<PriceAlert>(
      `/alerts/${id}/reset/`,
      undefined,
      { headers: getAlertClientHeaders() }
    )
    return response.data
  },
}

/**
 * Dashboard endpoints
 */
export const dashboardApi = {
  getStats: async () => {
    const response = await api.get<DashboardStats>('/dashboard/', {
      headers: getAlertClientHeaders(),
    })
    return response.data
  },

  triggerFetch: async () => {
    const response = await api.post<{ message: string; task_id: string }>('/fetch/')
    return response.data
  },
}

export default api
