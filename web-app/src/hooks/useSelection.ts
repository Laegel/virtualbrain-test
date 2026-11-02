import { useCallback, useState } from 'react'

/** Ordered selection of ids. Past `max`, a new pick replaces the oldest one. */
export function useSelection(max: number) {
  const [ids, setIds] = useState<number[]>([])

  const toggle = useCallback((id: number) => {
    setIds((current) => current.includes(id)
      ? current.filter((i) => i !== id)
      : [...current, id].slice(-max))
  }, [max])

  const clear = useCallback(() => setIds([]), [])

  return { ids, toggle, clear }
}
