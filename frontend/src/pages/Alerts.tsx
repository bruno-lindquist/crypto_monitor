import { useCallback, useState } from 'react'
import { 
  Bell, 
  Plus, 
  Trash2, 
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
} from 'lucide-react'
import AlertForm from '../components/AlertForm'
import { PageLoader } from '../components/LoadingSpinner'
import { useFetch } from '../hooks/useFetch'
import { alertApi, cryptoApi } from '../services/api'
import { formatPrice, formatPercent, formatDateTime } from '../utils/format'
import type { PriceAlert, CreateAlertData } from '../types'
import clsx from 'clsx'

type FilterType = 'all' | 'active' | 'triggered'

export default function Alerts() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [showAlertForm, setShowAlertForm] = useState(false)
  const fetchAlertsPage = useCallback(async () => {
    const [alertsData, cryptosData] = await Promise.all([
      alertApi.list(),
      cryptoApi.list(),
    ])
    return {
      alerts: alertsData.results,
      cryptos: cryptosData.results,
    }
  }, [])
  const { data, isLoading, error, refetch } = useFetch(fetchAlertsPage)
  const alerts = data?.alerts ?? []
  const cryptos = data?.cryptos ?? []

  const handleCreateAlert = async (data: CreateAlertData) => {
    await alertApi.create(data)
    setShowAlertForm(false)
    await refetch()
  }

  const handleDeleteAlert = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este alerta?')) return
    try {
      await alertApi.delete(id)
      await refetch()
    } catch (err) {
      console.error('Error deleting alert:', err)
    }
  }

  const handleResetAlert = async (id: number) => {
    try {
      await alertApi.reset(id)
      await refetch()
    } catch (err) {
      console.error('Error resetting alert:', err)
    }
  }

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'active') return alert.is_active && !alert.is_triggered
    if (filter === 'triggered') return alert.is_triggered
    return true
  })

  const stats = {
    total: alerts.length,
    active: alerts.filter((a) => a.is_active && !a.is_triggered).length,
    triggered: alerts.filter((a) => a.is_triggered).length,
  }

  if (isLoading) {
    return <PageLoader />
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Nao foi possivel carregar os alertas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alertas de Preço</h1>
          <p className="text-slate-400 mt-1">
            {stats.active} alertas ativos, {stats.triggered} disparados
          </p>
        </div>

        <button
          onClick={() => setShowAlertForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-white font-medium"
        >
          <Plus className="w-4 h-4" />
          Criar Alerta
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'triggered'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === f
                ? 'bg-crypto-primary text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            {f === 'all' && `Todos (${stats.total})`}
            {f === 'active' && `Ativos (${stats.active})`}
            {f === 'triggered' && `Disparados (${stats.triggered})`}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 bg-crypto-dark rounded-xl border border-slate-800">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">
              {filter === 'all'
                ? 'Nenhum alerta criado'
                : filter === 'active'
                ? 'Nenhum alerta ativo'
                : 'Nenhum alerta disparado'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setShowAlertForm(true)}
                className="mt-4 text-crypto-primary hover:underline"
              >
                Criar seu primeiro alerta
              </button>
            )}
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDelete={() => handleDeleteAlert(alert.id)}
              onReset={() => handleResetAlert(alert.id)}
            />
          ))
        )}
      </div>

      {/* Alert Form Modal */}
      {showAlertForm && (
        <AlertForm
          cryptos={cryptos}
          onSubmit={handleCreateAlert}
          onClose={() => setShowAlertForm(false)}
        />
      )}
    </div>
  )
}

interface AlertCardProps {
  alert: PriceAlert
  onDelete: () => void
  onReset: () => void
}

function AlertCard({ alert, onDelete, onReset }: AlertCardProps) {
  const isAbove = alert.condition === 'above'
  const distancePercent = alert.distance_percent

  return (
    <div
      className={clsx(
        'bg-crypto-dark rounded-xl p-4 border',
        alert.is_triggered
          ? 'border-emerald-500/50'
          : 'border-slate-800'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div
            className={clsx(
              'p-2 rounded-lg',
              alert.is_triggered
                ? 'bg-emerald-500/20 text-emerald-400'
                : isAbove
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            )}
          >
            {alert.is_triggered ? (
              <CheckCircle className="w-5 h-5" />
            ) : isAbove ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>

          {/* Alert Info */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">
                {alert.cryptocurrency_symbol}
              </h3>
              <span className="text-sm text-slate-400">
                {alert.cryptocurrency_name}
              </span>
            </div>
            
            <p className="text-slate-400 mt-1">
              {isAbove ? 'Acima de' : 'Abaixo de'}{' '}
              <span className="text-white font-medium">
                ${formatPrice(parseFloat(alert.target_price))}
              </span>
            </p>

            {alert.note && (
              <p className="text-sm text-slate-500 mt-1">{alert.note}</p>
            )}

            {/* Status Info */}
            <div className="flex items-center gap-4 mt-2 text-sm">
              {alert.is_triggered ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Disparado em {formatDateTime(alert.triggered_at!)}
                  {alert.triggered_price && (
                    <span className="text-slate-400 ml-1">
                      @ ${formatPrice(parseFloat(alert.triggered_price))}
                    </span>
                  )}
                </span>
              ) : (
                <>
                  {alert.current_price && (
                    <span className="text-slate-500">
                      Preço atual: ${formatPrice(alert.current_price)}
                    </span>
                  )}
                  {distancePercent !== null && (
                    <span
                      className={clsx(
                        'font-medium',
                        (isAbove && distancePercent > 0) ||
                          (!isAbove && distancePercent < 0)
                          ? 'text-slate-400'
                          : 'text-amber-400'
                      )}
                    >
                      {formatPercent(distancePercent)} para alvo
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
              <Clock className="w-3 h-3" />
              Criado em {formatDateTime(alert.created_at)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {alert.is_triggered && (
            <button
              onClick={onReset}
              title="Reativar alerta"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onDelete}
            title="Excluir alerta"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
