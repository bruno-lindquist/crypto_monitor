import { useState, useEffect } from 'react'
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
import StatCard from '../components/StatCard'
import CryptoCard from '../components/CryptoCard'
import { PageLoader } from '../components/LoadingSpinner'
import { dashboardApi, cryptoApi } from '../services/api'
import { formatRelativeTime } from '../utils/format'
import type { DashboardStats, Cryptocurrency } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [cryptos, setCryptos] = useState<Cryptocurrency[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const [statsData, cryptosData] = await Promise.all([
        dashboardApi.getStats(),
        cryptoApi.list({ active: true }),
      ])
      setStats(statsData)
      setCryptos(cryptosData.results)
      setError(null)
    } catch (err) {
      setError('Erro ao carregar dados. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await dashboardApi.triggerFetch()
      // Wait a bit for the task to process
      setTimeout(fetchData, 2000)
    } catch (err) {
      console.error('Error triggering refresh:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return <PageLoader />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-slate-400 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-lg bg-crypto-primary text-white"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            {stats?.last_collection
              ? `Última atualização: ${formatRelativeTime(stats.last_collection.completed_at || stats.last_collection.started_at)}`
              : 'Aguardando primeira coleta...'}
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Criptomoedas"
          value={stats?.active_cryptos || 0}
          icon={Coins}
          variant="default"
        />
        <StatCard
          title="Alertas Ativos"
          value={stats?.active_alerts || 0}
          icon={Bell}
          variant="warning"
        />
        <StatCard
          title="Alertas Disparados (24h)"
          value={stats?.triggered_alerts_24h || 0}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Status da Coleta"
          value={stats?.last_collection?.status === 'success' ? 'OK' : 'Erro'}
          icon={Activity}
          variant={stats?.last_collection?.status === 'success' ? 'success' : 'danger'}
        />
      </div>

      {/* Top Movers */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top Gainers */}
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

        {/* Top Losers */}
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

      {/* All Cryptos Preview */}
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
