import { useCallback, useEffect, useMemo, useRef } from 'react'

export function useAbortControllerRef() {
  const controllerRef = useRef<AbortController | null>(null)

  const replace = useCallback(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    return controller
  }, [])

  const abort = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  useEffect(() => abort, [abort])

  return useMemo(() => ({
    abort,
    replace,
  }), [abort, replace])
}
