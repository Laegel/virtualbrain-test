import { API_URL } from './http'

/**
 * Starts a battle and calls `onChunk` with each piece of text as the backend streams it.
 * fetch (not axios): browsers only expose response streams through fetch.
 * The client only sends ids; the prompt is built server side.
 */
export async function streamBattle(fighterIds: number[], onChunk: (text: string) => void, signal: AbortSignal): Promise<void> {
  const response = await fetch(`${API_URL}/battle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fighterIds }),
    signal,
  })
  if (!response.ok || !response.body) throw new Error(`Battle request failed (${response.status})`)

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return
    onChunk(value)
  }
}
