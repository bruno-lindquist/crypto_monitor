import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Bell, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  BarChart3,
  Clock,
} from 'lucide-react'
import PriceChart from '../components/PriceChart'
import CryptoAvatar from '../components/CryptoAvatar'
import AlertForm from '../components/AlertForm'
import { PageLoader } from '../components/LoadingSpinner'
import { useAbortControllerRef } from '../hooks/useAbortControllerRef'
import { cryptoApi, alertApi, isApiRequestCanceled } from '../services/api'
import { pollUntil } from '../utils/async'
import {
  formatCompact,
  formatDateTime,
  formatLatestBrlPrice,
  formatLatestUsdPrice,
  formatPercent,
  parseNumericValue,
} from '../utils/format'
import type { Cryptocurrency, PriceHistory, CreateAlertData } from '../types'

type TimeRange = 1 | 6 | 24 | 48 | 168
const ENABLE_MANUAL_REFRESH = import.meta.env.VITE_ENABLE_MANUAL_REFRESH === 'true'
const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 1, label: '1H' },
  { value: 6, label: '6H' },
  { value: 24, label: '24H' },
  { value: 48, label: '48H' },
  { value: 168, label: '7D' },
]

export default function CryptoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [crypto, setCrypto] = useState<Cryptocurrency | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedRange, setSelectedRange] = useState<TimeRange>(24)
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cryptoLoadRequest = useAbortControllerRef()
  const historyLoadRequest = useAbortControllerRef()
  const refreshRequest = useAbortControllerRef()

  const loadCryptoData = useCallback(async (cryptoId: number, signal?: AbortSignal) => {
    try {
      const data = await cryptoApi.get(cryptoId, { signal })

      if (signal?.aborted) {
        return
      }

      setCrypto(data)
    } catch (err) {
      if (isApiRequestCanceled(err) || signal?.aborted) {
        return
      }

      console.error('Error loading crypto:', err)
      navigate('/cryptos')
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [navigate])

  const loadPriceHistory = useCallback(async (
    cryptoId: number,
    hours: number,
    signal?: AbortSignal
  ) => {
    try {
      const data = await cryptoApi.getHistory(cryptoId, hours, { signal })

      if (signal?.aborted) {
        return
      }

      setPriceHistory(data)
    } catch (err) {
      if (isApiRequestCanceled(err) || signal?.aborted) {
        return
      }

      console.error('Error loading price history:', err)
    }
  }, [])

  useEffect(() => {
    if (id) {
      const controller = cryptoLoadRequest.replace()
      void loadCryptoData(parseInt(id), controller.signal)
    }
  }, [cryptoLoadRequest, id, loadCryptoData])

  useEffect(() => {
    if (id) {
      const controller = historyLoadRequest.replace()
      void loadPriceHistory(parseInt(id), selectedRange, controller.signal)
    }
  }, [historyLoadRequest, id, selectedRange, loadPriceHistory])

  const handleRefresh = async () => {
    if (!id) return

    const controller = refreshRequest.replace()

    setIsRefreshing(true)
    setError(null)
    try {
      const cryptoId = parseInt(id)
      const previousCollectedAt = crypto?.latest_price?.collected_at ?? null
      await cryptoApi.refresh(cryptoId)
      const status = await pollUntil({
        signal: controller.signal,
        task: async () => {
          const [cryptoData, historyData] = await Promise.all([
            cryptoApi.get(cryptoId, { signal: controller.signal }),
            cryptoApi.getHistory(cryptoId, selectedRange, { signal: controller.signal }),
          ])

          if (!controller.signal.aborted) {
            setCrypto(cryptoData)
            setPriceHistory(historyData)
          }

          return cryptoData.latest_price?.collected_at ?? null
        },
        until: (updatedCollectedAt) =>
          updatedCollectedAt !== null && updatedCollectedAt !== previousCollectedAt,
      })

      if (status === 'timeout' && !controller.signal.aborted) {
        setError('A atualização manual demorou mais do que o esperado.')
      }
    } catch (err) {
      if (isApiRequestCanceled(err) || controller.signal.aborted) {
        return
      }

      console.error('Error refreshing:', err)
      setError('Não foi possível concluir a atualização manual.')
    } finally {
      if (!controller.signal.aborted) {
        setIsRefreshing(false)
      }
    }
  }

  const handleCreateAlert = async (data: CreateAlertData) => {
    await alertApi.create(data)
    setShowAlertForm(false)
  }

  if (isLoading || !crypto) {
    return <PageLoader />
  }

  const price = crypto.latest_price
  const change24h = parseNumericValue(price?.change_24h)
  const isPositive = change24h !== null && change24h >= 0
  const volume24hUsd = parseNumericValue(price?.volume_24h_usd)

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <CryptoAvatar crypto={crypto} size="lg" />
          <div>
            <h1 className="text-3xl font-bold text-white">{crypto.name}</h1>
            <p className="text-slate-400">{crypto.symbol}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {ENABLE_MANUAL_REFRESH && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          )}
          <button
            onClick={() => setShowAlertForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-white"
          >
            <Bell className="w-4 h-4" />
            Criar Alerta
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-crypto-dark rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Preço USD</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatLatestUsdPrice(price)}
          </p>
        </div>

        <div className="bg-crypto-dark rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Preço BRL</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatLatestBrlPrice(price, 'Indisponível')}
          </p>
        </div>

        <div className="bg-crypto-dark rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm">Variação 24h</span>
          </div>
          <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {change24h !== null ? formatPercent(change24h) : '-'}
          </p>
        </div>

        <div className="bg-crypto-dark rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Volume 24h</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {volume24hUsd === null ? '-' : `$${formatCompact(volume24hUsd)}`}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="bg-crypto-dark rounded-xl p-4 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Histórico de Preços</h2>
          <div className="flex gap-1">
            {TIME_RANGES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedRange(value)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedRange === value
                    ? 'bg-crypto-primary text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <PriceChart data={priceHistory} height={300} />
      </div>

      {price && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          Última atualização: {formatDateTime(price.collected_at)}
        </div>
      )}

      {showAlertForm && (
        <AlertForm
          cryptos={[crypto]}
          onSubmit={handleCreateAlert}
          onClose={() => setShowAlertForm(false)}
        />
      )}
    </div>
  )
}
