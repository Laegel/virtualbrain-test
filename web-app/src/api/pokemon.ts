import type { PokemonSummary } from '../types/pokemon'
import { http } from './http'

export async function fetchPokemons(signal?: AbortSignal): Promise<PokemonSummary[]> {
  const { data } = await http.get<{ pokemons: PokemonSummary[] }>('/pokemons', { signal })
  return data.pokemons
}
