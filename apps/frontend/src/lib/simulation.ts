import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Der Prototyp arbeitet ohne Backend. KI-Analyse, Websuche und
 * Varianten-Erzeugung werden mit einer kurzen Wartezeit simuliert.
 * In Tests (MODE === 'test') entfaellt die Wartezeit.
 */
const IS_TEST = import.meta.env.MODE === 'test'

export const SIMULATION_DELAY_MS = {
  uploadAnalyse: 2000,
  varianten: 1800,
  kiErstellung: 2200,
  websuche: 1600,
} as const

export type SimulationStep = keyof typeof SIMULATION_DELAY_MS

export function delayFor(step: SimulationStep): number {
  return IS_TEST ? 0 : SIMULATION_DELAY_MS[step]
}

export type SimulatedTask = {
  running: boolean
  done: boolean
  start: (onDone?: () => void) => void
  reset: () => void
}

/**
 * Zustand fuer einen simulierten Arbeitsschritt: laeuft / fertig.
 * Raeumt den Timer auf, wenn die Komponente vorher verschwindet.
 */
export function useSimulatedTask(step: SimulationStep): SimulatedTask {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => clear, [clear])

  const start = useCallback(
    (onDone?: () => void) => {
      clear()
      setRunning(true)
      setDone(false)
      timer.current = setTimeout(() => {
        timer.current = null
        setRunning(false)
        setDone(true)
        onDone?.()
      }, delayFor(step))
    },
    [clear, step],
  )

  const reset = useCallback(() => {
    clear()
    setRunning(false)
    setDone(false)
  }, [clear])

  return { running, done, start, reset }
}
