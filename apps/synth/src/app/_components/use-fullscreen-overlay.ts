'use client'

import { type RefObject, useEffect, useRef } from 'react'

export interface FullscreenOverlay {
  containerRef: RefObject<HTMLDivElement | null>
  handleFullscreen: () => void
}

/**
 * Общий каркас полноэкранного оверлея — Escape закрывает, выход из React-состояния `open`
 * (не только Esc/кнопка, любой путь закрытия) выходит из настоящего Fullscreen API, если он был
 * запрошен. Вынесено из дублирования `vj-overlay.tsx`/`teleprompter-overlay.tsx` — оба были
 * побайтово одинаковы в этой части.
 */
export function useFullscreenOverlay(open: boolean, onClose: () => void): FullscreenOverlay {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
    }
  }, [open])

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
    } else {
      void containerRef.current?.requestFullscreen().catch(() => undefined)
    }
  }

  return { containerRef, handleFullscreen }
}
