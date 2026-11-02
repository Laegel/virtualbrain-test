import { useState, useSyncExternalStore } from 'react'
import { ArenaPage, type BattleMode } from './features/arena/ArenaPage'
import { BrowsePage } from './features/browse/BrowsePage'
import { DesignSystemPage } from './features/design-system/DesignSystemPage'
import { usePokemons } from './hooks/usePokemons'
import { Header } from './layout/Header'
import { ThemeProvider } from './theme/ThemeProvider'
import type { PokemonSummary } from './types/pokemon'
import { Button, Spinner } from './ui'

const subscribeToHash = (callback: () => void) => {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}
const getHash = () => window.location.hash

export default function App() {
  const hash = useSyncExternalStore(subscribeToHash, getHash)
  const data = usePokemons()
  const [battle, setBattle] = useState<{ fighters: PokemonSummary[], mode: BattleMode } | null>(null)

  const page = () => {
    if (hash === '#design-system') return <DesignSystemPage />
    if (data.status === 'loading') {
      return <div className="grid flex-1 place-items-center"><Spinner label="Loading Pokémon (the very first load can take a minute)" /></div>
    }
    if (data.status === 'error') {
      return (
        <div className="grid flex-1 place-items-center">
          <div className="flex flex-col items-center gap-3">
            <p className="text-danger">Couldn't load the Pokémon. Is the backend running?</p>
            <Button onClick={data.retry}>Retry</Button>
          </div>
        </div>
      )
    }
    return battle
      ? <ArenaPage fighters={battle.fighters} mode={battle.mode} onBack={() => setBattle(null)} />
      : <BrowsePage pokemons={data.pokemons} onFight={(fighters, mode) => setBattle({ fighters, mode })} />
  }

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <Header onHome={() => { setBattle(null); window.location.hash = '' }} />
        {page()}
      </div>
    </ThemeProvider>
  )
}
