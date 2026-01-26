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
import AlertForm from '../components/AlertForm'
import { PageLoader } from '../components/LoadingSpinner'
import { cryptoApi, alertApi } from '../services/api'
import { formatPrice, formatPercent, formatCompact, formatDateTime } from '../utils/format'
import type { Cryptocurrency, PriceHistory, CreateAlertData } from '../types'

type TimeRange = 1 | 6 | 24 | 48 | 168

export default function CryptoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [crypto, setCrypto] = useState<Cryptocurrency | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedRange, setSelectedRange] = useState<TimeRange>(24)
  const [showAlertForm, setShowAlertForm] = useState(false)

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: 1, label: '1H' },
    { value: 6, label: '6H' },
    { value: 24, label: '24H' },
    { value: 48, label: '48H' },
    { value: 168, label: '7D' },
  ]

  const loadCryptoData = useCallback(async (cryptoId: number) => {
    try {
      const data = await cryptoApi.get(cryptoId)
      setCrypto(data)
    } catch (err) {
      console.error('Error loading crypto:', err)
      navigate('/cryptos')
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  const loadPriceHistory = useCallback(async (cryptoId: number, hours: number) => {
    try {
      const data = await cryptoApi.getHistory(cryptoId, hours)
      setPriceHistory(data)
    } catch (err) {
      console.error('Error loading price history:', err)
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadCryptoData(parseInt(id))
    }
  }, [id, loadCryptoData])

  useEffect(() => {
    if (id) {
      loadPriceHistory(parseInt(id), selectedRange)
    }
  }, [id, selectedRange, loadPriceHistory])

  const handleRefresh = async () => {
    if (!id) return
    setIsRefreshing(true)
    try {
      await cryptoApi.refresh(parseInt(id))
      setTimeout(() => {
        loadCryptoData(parseInt(id))
        loadPriceHistory(parseInt(id), selectedRange)
      }, 2000)
    } catch (err) {
      console.error('Error refreshing:', err)
    } finally {
      setIsRefreshing(false)
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
  const change24h = price?.change_24h ? parseFloat(price.change_24h) : null
  const isPositive = change24h !== null && change24h >= 0

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {crypto.image_url ? (
            <img
              src={crypto.image_url}
              alt={crypto.name}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-2xl font-bold text-slate-400">
                {crypto.symbol.slice(0, 2)}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white">{crypto.name}</h1>
            <p className="text-slate-400">{crypto.symbol}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => setShowAlertForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-white"
          >
            <Bell className="w-4 h-4" />
            Criar Alerta
          </button>
        </div>
      </div>

      {/* Price Info */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-crypto-dark rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Preço USD</span>
          </div>
          <p className="text-2xl font-bold text-white">
            ${price ? formatPrice(parseFloat(price.price_usd)) : '-'}
          </p>
        </div>

        <div className="bg-crypto-dark rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Preço BRL</span>
          </div>
          <p className="text-2xl font-bold text-white">
            R$ {price ? formatPrice(parseFloat(price.price_brl)) : '-'}
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
            ${price?.volume_24h_usd ? formatCompact(parseFloat(price.volume_24h_usd)) : '-'}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-crypto-dark rounded-xl p-4 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Histórico de Preços</h2>
          <div className="flex gap-1">
            {timeRanges.map(({ value, label }) => (
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

      {/* Last Update */}
      {price && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          Última atualização: {formatDateTime(price.collected_at)}
        </div>
      )}

      {/* Alert Form Modal */}
      {showAlertForm && (
        <AlertForm
          cryptos={[crypto]}
          selectedCrypto={crypto}
          onSubmit={handleCreateAlert}
          onClose={() => setShowAlertForm(false)}
        />
      )}
    </div>
  )
}
