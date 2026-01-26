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
  CollectionLog,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

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

/**
 * Cryptocurrency endpoints
 */
export const cryptoApi = {
  list: async (params?: { active?: boolean; search?: string }) => {
    const response = await api.get<PaginatedResponse<Cryptocurrency>>('/cryptos/', { params })
    return response.data
  },

  get: async (id: number) => {
    const response = await api.get<Cryptocurrency & { price_history_24h: PriceHistory[] }>(
      `/cryptos/${id}/`
    )
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
 * Price history endpoints
 */
export const priceApi = {
  list: async (params?: { crypto?: number; symbol?: string; hours?: number; limit?: number }) => {
    const response = await api.get<PaginatedResponse<PriceHistory>>('/prices/', { params })
    return response.data
  },

  get: async (id: number) => {
    const response = await api.get<PriceHistory>(`/prices/${id}/`)
    return response.data
  },
}

/**
 * Alert endpoints
 */
export const alertApi = {
  list: async (params?: { crypto?: number; triggered?: boolean; active?: boolean }) => {
    const response = await api.get<PaginatedResponse<PriceAlert>>('/alerts/', { params })
    return response.data
  },

  get: async (id: number) => {
    const response = await api.get<PriceAlert>(`/alerts/${id}/`)
    return response.data
  },

  create: async (data: CreateAlertData) => {
    const response = await api.post<PriceAlert>('/alerts/', data)
    return response.data
  },

  update: async (id: number, data: Partial<CreateAlertData>) => {
    const response = await api.patch<PriceAlert>(`/alerts/${id}/`, data)
    return response.data
  },

  delete: async (id: number) => {
    await api.delete(`/alerts/${id}/`)
  },

  reset: async (id: number) => {
    const response = await api.post<PriceAlert>(`/alerts/${id}/reset/`)
    return response.data
  },
}

/**
 * Dashboard endpoints
 */
export const dashboardApi = {
  getStats: async () => {
    const response = await api.get<DashboardStats>('/dashboard/')
    return response.data
  },

  triggerFetch: async () => {
    const response = await api.post<{ message: string; task_id: string }>('/fetch/')
    return response.data
  },
}

/**
 * Logs endpoints
 */
export const logsApi = {
  list: async () => {
    const response = await api.get<PaginatedResponse<CollectionLog>>('/logs/')
    return response.data
  },
}

export default api
