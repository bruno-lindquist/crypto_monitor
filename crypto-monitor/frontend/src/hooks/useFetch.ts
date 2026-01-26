import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for fetching data with loading and error states.
 */
export function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchFn()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, deps)

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, isLoading, error, refetch: fetch }
}

/**
 * Custom hook for periodic data refresh.
 */
export function useInterval(callback: () => void, delay: number | null) {
  useEffect(() => {
    if (delay === null) return

    const id = setInterval(callback, delay)
    return () => clearInterval(id)
  }, [callback, delay])
}

/**
 * Custom hook combining fetch with auto-refresh.
 */
export function useAutoRefresh<T>(
  fetchFn: () => Promise<T>,
  refreshInterval: number = 60000, // 1 minute default
  deps: unknown[] = []
) {
  const { data, isLoading, error, refetch } = useFetch(fetchFn, deps)

  useInterval(() => {
    refetch()
  }, refreshInterval)

  return { data, isLoading, error, refetch }
}
