import { useState, useEffect, useRef } from 'react'

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
  const fetchFnRef = useRef(fetchFn)
  
  // Keep the ref updated
  fetchFnRef.current = fetchFn

  const fetch = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchFnRef.current()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, isLoading, error, refetch: fetch }
}
