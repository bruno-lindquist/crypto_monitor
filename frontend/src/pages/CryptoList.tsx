import { useDeferredValue, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import CryptoCard from '../components/CryptoCard'
import { PageLoader } from '../components/LoadingSpinner'
import AlertForm from '../components/AlertForm'
import { cryptoApi, alertApi } from '../services/api'
import type { Cryptocurrency, CreateAlertData } from '../types'

export default function CryptoList() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [selectedCrypto, setSelectedCrypto] = useState<Cryptocurrency | undefined>()
  const [cryptos, setCryptos] = useState<Cryptocurrency[]>([])
  const [totalCryptos, setTotalCryptos] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const normalizedSearchQuery = deferredSearchQuery.trim()

  useEffect(() => {
    let isMounted = true

    async function loadCryptos() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await cryptoApi.list(
          normalizedSearchQuery ? { search: normalizedSearchQuery } : undefined
        )

        if (!isMounted) {
          return
        }

        setCryptos(data.results)
        setTotalCryptos(data.count)
      } catch (err) {
        if (!isMounted) {
          return
        }

        console.error('Error loading cryptocurrencies:', err)
        setError('Nao foi possivel carregar as criptomoedas.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadCryptos()

    return () => {
      isMounted = false
    }
  }, [normalizedSearchQuery])

  const handleCreateAlert = async (data: CreateAlertData) => {
    await alertApi.create(data)
    setShowAlertForm(false)
    setSelectedCrypto(undefined)
  }

  const openAlertForm = (crypto?: Cryptocurrency) => {
    setSelectedCrypto(crypto)
    setShowAlertForm(true)
  }

  if (isLoading) {
    return <PageLoader />
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Criptomoedas</h1>
          <p className="text-slate-400 mt-1">
            {normalizedSearchQuery ? `${totalCryptos} resultados` : `${totalCryptos} criptomoedas monitoradas`}
          </p>
        </div>

        <button
          onClick={() => openAlertForm()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-white font-medium"
        >
          <Plus className="w-4 h-4" />
          Criar Alerta
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome ou símbolo..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-crypto-dark border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-crypto-primary"
        />
      </div>

      {/* Crypto Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cryptos.map((crypto) => (
          <CryptoCard
            key={crypto.id}
            crypto={crypto}
            onClick={() => navigate(`/cryptos/${crypto.id}`)}
          />
        ))}
      </div>

      {cryptos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">
            {normalizedSearchQuery
              ? 'Nenhuma criptomoeda encontrada'
              : 'Nenhuma criptomoeda cadastrada'}
          </p>
        </div>
      )}

      {/* Alert Form Modal */}
      {showAlertForm && (
        <AlertForm
          cryptos={cryptos}
          selectedCrypto={selectedCrypto}
          onSubmit={handleCreateAlert}
          onClose={() => {
            setShowAlertForm(false)
            setSelectedCrypto(undefined)
          }}
        />
      )}
    </div>
  )
}
