'use client'

import {
  DEFAULT_TELEPROMPTER_SPEED,
  loadTeleprompterLyrics,
  loadTeleprompterSpeed,
  saveTeleprompterLyrics,
  saveTeleprompterSpeed,
} from '@/lib/patch/teleprompter-storage'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

export interface Teleprompter {
  lyrics: string
  setLyrics: (text: string) => void
  speed: number
  setSpeed: (speed: number) => void
  running: boolean
  toggleRunning: () => void
  reset: () => void
  scrollRef: RefObject<HTMLDivElement | null>
}

/**
 * Автопрокрутка текста стихов для репетиции сцены (Фаза 5). Текст и скорость переживают
 * перезагрузку страницы (localStorage — суфлёр читается один патч зараз, не нужен весь IndexedDB).
 * Прокрутка — не React state на каждый кадр (дёргало бы рендер 60 раз в секунду), а прямая
 * запись в `scrollTop` DOM-узла внутри requestAnimationFrame, как и авто-орбита мастер-шины.
 */
export function useTeleprompter(): Teleprompter {
  const [lyrics, setLyricsState] = useState('')
  const [speed, setSpeedState] = useState(DEFAULT_TELEPROMPTER_SPEED)
  const [running, setRunning] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const speedRef = useRef(speed)

  useEffect(() => {
    setLyricsState(loadTeleprompterLyrics())
    setSpeedState(loadTeleprompterSpeed())
  }, [])

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  const setLyrics = useCallback((text: string) => {
    setLyricsState(text)
    saveTeleprompterLyrics(text)
  }, [])

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s)
    saveTeleprompterSpeed(s)
  }, [])

  const toggleRunning = useCallback(() => setRunning((r) => !r), [])

  const reset = useCallback(() => {
    setRunning(false)
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [])

  useEffect(() => {
    if (!running) {
      return
    }
    let lastTime = performance.now()

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now
      const el = scrollRef.current
      if (el) {
        el.scrollTop += speedRef.current * dt
        // Достигли конца текста — прокрутка сама останавливается, не крутит вхолостую
        if (el.scrollTop >= el.scrollHeight - el.clientHeight) {
          setRunning(false)
          return
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [running])

  return { lyrics, setLyrics, speed, setSpeed, running, toggleRunning, reset, scrollRef }
}
