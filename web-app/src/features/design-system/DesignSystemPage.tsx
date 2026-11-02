import { Button, HpBar, SearchInput, Spinner, StatBar, Surface, TypeBadge, TypeToggle } from '../../ui'
import { POKEMON_TYPES } from '../../types/pokemon'

const SWATCHES = ['bg', 'surface', 'surface-2', 'border', 'fg', 'muted', 'accent', 'danger'] as const

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  )
}

/** Living reference for the UI kit, reachable at /#design-system */
export function DesignSystemPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-6">
      <Section title="Colors (tokens in index.css)">
        <div className="flex flex-wrap gap-3">
          {SWATCHES.map((name) => (
            <div key={name} className="flex w-24 flex-col gap-1 text-xs">
              <div className="h-12 rounded-lg border border-border" style={{ backgroundColor: `rgb(var(--${name}))` }} />
              {name}
            </div>
          ))}
        </div>
      </Section>
      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>
      <Section title="Type badges and toggles">
        <div className="flex flex-wrap gap-1.5">{POKEMON_TYPES.map((t) => <TypeBadge key={t} type={t} />)}</div>
        <div className="flex gap-1.5"><TypeToggle type="fire" pressed /><TypeToggle type="water" pressed={false} /></div>
      </Section>
      <Section title="HP bar">
        <div className="flex max-w-xs flex-col gap-3">
          <HpBar label="Healthy" current={120} max={135} />
          <HpBar label="Hurt" current={60} max={135} />
          <HpBar label="Critical" current={20} max={135} />
        </div>
      </Section>
      <Section title="Input, stats, surface, spinner">
        <SearchInput placeholder="Search by name" aria-label="Example search" className="max-w-sm" />
        <Surface className="flex max-w-xs flex-col gap-1 p-3">
          <StatBar label="HP" value={45} />
          <StatBar label="Attack" value={130} />
          <StatBar label="Speed" value={200} />
        </Surface>
        <Spinner />
      </Section>
    </main>
  )
}
