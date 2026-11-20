import { useCallback, useEffect, useRef, useState } from 'react'

/** Charge des données ; renvoie { data, error, loading, reload }. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const seq = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  const reload = useCallback(async () => {
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await run()
      if (id === seq.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (id === seq.current) setState((s) => ({ ...s, error, loading: false }))
    }
  }, [run])

  useEffect(() => {
    reload()
  }, [reload])

  return { ...state, reload }
}

/** Valeur retardée (recherche au fil de la frappe). */
export function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
