import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Coins, 
  Bell, 
  Activity, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import CryptoCard from '../components/CryptoCard'
import { PageLoader } from '../components/LoadingSpinner'
import { useAbortControllerRef } from '../hooks/useAbortControllerRef'
import { dashboardApi, cryptoApi, isApiRequestCanceled } from '../services/api'
import { pollUntil } from '../utils/async'
import { formatRelativeTime } from '../utils/format'
import type { DashboardStats, Cryptocurrency } from '../types'

const ENABLE_MANUAL_REFRESH = import.meta.env.VITE_ENABLE_MANUAL_REFRESH === 'true'
const STAT_VARIANT_STYLES = {
  default: 'bg-crypto-primary/20 text-crypto-primary',
  success: 'bg-emerald-500/20 text-emerald-400',
  danger: 'bg-red-500/20 text-red-400',
  warning: 'bg-amber-500/20 text-amber-400',
} as const

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [cryptos, setCryptos] = useState<Cryptocurrency[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadRequest = useAbortControllerRef()
  const refreshRequest = useAbortControllerRef()

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    const [statsData, cryptosData] = await Promise.all([
      dashboardApi.getStats({ signal }),
      cryptoApi.list({ active: true }, { signal }),
    ])

    if (signal?.aborted) {
      return { statsData, cryptosData }
    }

    setStats(statsData)
    setCryptos(cryptosData)
    setError(null)
    return { statsData, cryptosData }
  }, [])

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      await fetchData(signal)
    } catch (err) {
      if (isApiRequestCanceled(err) || signal?.aborted) {
        return
      }

      setError('Erro ao carregar dados. Tente novamente.')
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [fetchData])

  useEffect(() => {
    const runLoad = () => {
      const controller = loadRequest.replace()
      void loadData(controller.signal)
    }

    runLoad()

    const interval = setInterval(runLoad, 60000)

    return () => {
      clearInterval(interval)
      loadRequest.abort()
      refreshRequest.abort()
    }
  }, [loadData, loadRequest, refreshRequest])

  const handleManualRefresh = async () => {
    const controller = refreshRequest.replace()

    setIsRefreshing(true)
    setError(null)
    try {
      const baselineCollectionId = stats?.last_collection?.id ?? null
      await dashboardApi.triggerFetch()
      const status = await pollUntil({
        signal: controller.signal,
        task: async () => (await fetchData(controller.signal)).statsData.last_collection,
        until: (currentCollection) =>
          currentCollection !== null &&
          (baselineCollectionId === null || currentCollection.id !== baselineCollectionId) &&
          Boolean(currentCollection.completed_at),
      })

      if (status === 'timeout' && !controller.signal.aborted) {
        setError('A atualização manual demorou mais do que o esperado.')
      }
    } catch (err) {
      if (isApiRequestCanceled(err) || controller.signal.aborted) {
        return
      }

      console.error('Error triggering refresh:', err)
      setError('Não foi possível concluir a atualização manual.')
    } finally {
      if (!controller.signal.aborted) {
        setIsRefreshing(false)
      }
    }
  }

  if (isLoading) {
    return <PageLoader />
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-slate-400 mb-4">{error}</p>
        <button
          onClick={() => {
            setIsLoading(true)
            const controller = loadRequest.replace()
            void loadData(controller.signal)
          }}
          className="px-4 py-2 rounded-lg bg-crypto-primary text-white"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const collectionState = !stats?.last_collection
    ? 'waiting'
    : !stats.last_collection.completed_at
    ? 'running'
    : stats.last_collection.status === 'success'
    ? 'success'
    : 'error'
  const statsCards = [
    {
      title: 'Criptomoedas',
      value: stats?.active_cryptos || 0,
      icon: Coins,
      variant: 'default',
    },
    {
      title: 'Alertas Ativos',
      value: stats?.active_alerts || 0,
      icon: Bell,
      variant: 'warning',
    },
    {
      title: 'Alertas Disparados (24h)',
      value: stats?.triggered_alerts_24h || 0,
      icon: CheckCircle,
      variant: 'success',
    },
    {
      title: 'Status da Coleta',
      value:
        collectionState === 'waiting'
          ? 'Aguardando'
          : collectionState === 'running'
          ? 'Coletando'
          : collectionState === 'success'
          ? 'OK'
          : 'Erro',
      icon: Activity,
      variant:
        collectionState === 'success'
          ? 'success'
          : collectionState === 'running' || collectionState === 'waiting'
          ? 'warning'
          : 'danger',
    },
  ] as const

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            {collectionState === 'running'
              ? 'Coleta em andamento...'
              : stats?.last_collection
              ? `Última atualização: ${formatRelativeTime(stats.last_collection.completed_at || stats.last_collection.started_at)}`
              : 'Aguardando primeira coleta...'}
          </p>
        </div>
        {ENABLE_MANUAL_REFRESH && (
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(({ title, value, icon: Icon, variant }) => (
          <div key={title} className="bg-crypto-dark rounded-xl p-4 border border-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
              <div className={`p-3 rounded-lg ${STAT_VARIANT_STYLES[variant]}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Maiores Altas</h2>
          </div>
          <div className="space-y-3">
            {stats?.top_gainers && stats.top_gainers.length > 0 ? (
              stats.top_gainers.slice(0, 5).map((crypto) => (
                <CryptoCard
                  key={crypto.id}
                  crypto={crypto}
                  onClick={() => navigate(`/cryptos/${crypto.id}`)}
                />
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">
                Sem dados disponíveis
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Maiores Baixas</h2>
          </div>
          <div className="space-y-3">
            {stats?.top_losers && stats.top_losers.length > 0 ? (
              stats.top_losers.slice(0, 5).map((crypto) => (
                <CryptoCard
                  key={crypto.id}
                  crypto={crypto}
                  onClick={() => navigate(`/cryptos/${crypto.id}`)}
                />
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">
                Sem dados disponíveis
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Todas as Criptomoedas</h2>
          <button
            onClick={() => navigate('/cryptos')}
            className="text-sm text-crypto-primary hover:underline"
          >
            Ver todas →
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cryptos.slice(0, 8).map((crypto) => (
            <CryptoCard
              key={crypto.id}
              crypto={crypto}
              onClick={() => navigate(`/cryptos/${crypto.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
