'use client'

import { useCallback, useSyncExternalStore } from 'react'

function subscribe(callback: () => void): () => void {
  document.addEventListener('fullscreenchange', callback)
  return () => document.removeEventListener('fullscreenchange', callback)
}

const getSupported = () => document.fullscreenEnabled === true
const getIsFullscreen = () => document.fullscreenElement !== null
const getServerSnapshot = () => false

/**
 * Полноэкранный режим страницы (Fullscreen API).
 * `supported` = false на iPhone: Safari не умеет полный экран для обычных страниц —
 * там помогает только установка приложения на экран «Домой».
 */
export function useFullscreen() {
  const supported = useSyncExternalStore(subscribe, getSupported, getServerSnapshot)
  const isFullscreen = useSyncExternalStore(subscribe, getIsFullscreen, getServerSnapshot)

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      }
    } catch {
      // браузер отклонил запрос (нужен жест пользователя) — состояние поправит событие
    }
  }, [])

  return { supported, isFullscreen, toggle }
}
