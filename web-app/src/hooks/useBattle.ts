import { useCallback, useEffect, useRef, useState } from 'react'
import { streamBattle } from '../api/battle'

type Status = 'streaming' | 'done' | 'error'

/** Starts a battle on mount (and on `restart`), accumulating the streamed text. */
export function useBattle(fighterIds: number[]) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<Status>('streaming')
  const [run, setRun] = useState(0)
  const key = fighterIds.join(',')
  const idsRef = useRef(fighterIds)
  idsRef.current = fighterIds

  useEffect(() => {
    const controller = new AbortController()
    setText('')
    setStatus('streaming')
    streamBattle(idsRef.current, (chunk) => setText((t) => t + chunk), controller.signal)
      .then(() => setStatus('done'))
      .catch(() => { if (!controller.signal.aborted) setStatus('error') })
    return () => controller.abort()
  }, [key, run])

  const restart = useCallback(() => setRun((n) => n + 1), [])

  return { text, status, restart }
}
