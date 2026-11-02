import type { TurnEvent } from '../types/turn-battle'
import { API_URL } from './http'

/** Plays a turn-based battle, calling `onEvent` for each event as soon as its line arrives */
export async function streamTurnBattle(fighterIds: number[], onEvent: (event: TurnEvent) => void, signal: AbortSignal): Promise<void> {
  const response = await fetch(`${API_URL}/battle/turn-based`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fighterIds }),
    signal,
  })
  if (!response.ok || !response.body) throw new Error(`Battle request failed (${response.status})`)

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return
    buffer += value
    for (let newline = buffer.indexOf('\n'); newline !== -1; newline = buffer.indexOf('\n')) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (line) onEvent(JSON.parse(line) as TurnEvent)
    }
  }
}
