'use client'

/**
 * PlayerContext — контекст для передачи ref контейнера плеера
 *
 * Используется для корректной работы Portal в fullscreen режиме.
 * Portal должен рендериться внутри fullscreen контейнера.
 */

import { createContext, type RefObject, useContext } from 'react'

interface PlayerContextValue {
  /** Ref на контейнер плеера (для Portal в fullscreen) */
  containerRef: RefObject<HTMLElement | null> | null
}

const PlayerContext = createContext<PlayerContextValue>({
  containerRef: null,
})

export const PlayerContextProvider = PlayerContext.Provider

/**
 * Хук для получения containerRef плеера
 * Используется в TrackSelector для корректной работы Portal в fullscreen
 */
export function usePlayerContainer(): RefObject<HTMLElement | null> | null {
  const context = useContext(PlayerContext)
  return context.containerRef
}
