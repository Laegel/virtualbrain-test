import { useCallback, useEffect, useState } from 'react'
import { fetchPokemons } from '../api/pokemon'
import type { PokemonSummary } from '../types/pokemon'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready', pokemons: PokemonSummary[] }

export function usePokemons() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchPokemons(controller.signal)
      .then((pokemons) => setState({ status: 'ready', pokemons }))
      .catch(() => { if (!controller.signal.aborted) setState({ status: 'error' }) })
    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
