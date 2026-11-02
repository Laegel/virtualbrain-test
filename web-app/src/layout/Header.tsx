import { FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from '../theme/theme-context'
import { Button } from '../ui'

export function Header({ onHome }: { onHome: () => void }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <button type="button" onClick={onHome} className="text-lg font-bold tracking-tight">
          Poke<span className="text-accent">Battle</span>
        </button>
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          {theme === 'light' ? <FiMoon aria-hidden /> : <FiSun aria-hidden />}
        </Button>
      </div>
    </header>
  )
}
