export const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const

export type PokemonTypeName = (typeof POKEMON_TYPES)[number]

export interface StatBlock {
  HP: number
  attack: number
  defense: number
  special_attack: number
  special_defense: number
  speed: number
}

/** Shape returned by GET /pokemons (one entry per pokemon, ids 1 to 898) */
export interface PokemonSummary {
  id: number
  name: string
  image: string
  types: PokemonTypeName[]
  stats: StatBlock
}

/** Type names come from the backend: only known ones may reach a CSS variable name */
export const asPokemonType = (type: string | undefined): PokemonTypeName =>
  (POKEMON_TYPES as readonly string[]).includes(type ?? '') ? (type as PokemonTypeName) : 'normal'
