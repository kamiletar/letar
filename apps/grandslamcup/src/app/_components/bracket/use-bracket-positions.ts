'use client'

/**
 * Хук для измерения DOM-позиций карточек матчей.
 * Используется для построения SVG-коннекторов.
 */

import type { RefObject } from 'react'
import { useCallback, useEffect, useState } from 'react'

export interface SlotRect {
  left: number
  right: number
  top: number
  bottom: number
  centerY: number
}

/**
 * Измеряет позиции карточек внутри контейнера через data-slot-id.
 * Возвращает Map<slotId, SlotRect> с координатами относительно контейнера.
 */
export function useBracketPositions(
  containerRef: RefObject<HTMLDivElement | null>,
  slotIds: string[]
): Map<string, SlotRect> {
  const [positions, setPositions] = useState<Map<string, SlotRect>>(new Map())

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    const newPositions = new Map<string, SlotRect>()

    for (const slotId of slotIds) {
      const el = container.querySelector(`[data-slot-id="${slotId}"]`)
      if (!el) {
        continue
      }

      const rect = el.getBoundingClientRect()
      const relRect: SlotRect = {
        left: rect.left - containerRect.left,
        right: rect.right - containerRect.left,
        top: rect.top - containerRect.top,
        bottom: rect.bottom - containerRect.top,
        centerY: (rect.top + rect.bottom) / 2 - containerRect.top,
      }
      newPositions.set(slotId, relRect)
    }

    setPositions(newPositions)
  }, [containerRef, slotIds])

  useEffect(() => {
    // Измерить после рендера (RAF для ожидания Chakra стилей)
    const raf = requestAnimationFrame(() => measure())

    // ResizeObserver для перемерки при изменении размера
    const container = containerRef.current
    if (!container) {
      return () => cancelAnimationFrame(raf)
    }

    const observer = new ResizeObserver(() => measure())
    observer.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [measure, containerRef])

  return positions
}
