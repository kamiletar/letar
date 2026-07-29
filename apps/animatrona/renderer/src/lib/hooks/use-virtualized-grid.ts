'use client'

import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useLayoutEffect, useRef, useState } from 'react'

/** Минимальная ширина карточки — та же величина, что была в `minmax(200px, 1fr)` */
const MIN_CARD_WIDTH = 200
/** Зазор между карточками — Chakra токен `gap={4}` (1rem) */
const GRID_GAP = 16

export interface UseVirtualizedGridOptions {
  /** Оценка высоты строки по ширине карточки — уточняется через measureElement */
  estimateSize: (cardWidth: number) => number
  overscan?: number
}

/**
 * Виртуализация сетки карточек с адаптивным числом колонок.
 * Повторяет поведение CSS `repeat(auto-fill, minmax(200px, 1fr))`, но с виртуализацией строк
 * через `useWindowVirtualizer` (скроллится сама страница, не контейнер).
 */
export function useVirtualizedGrid(itemCount: number, { estimateSize, overscan = 3 }: UseVirtualizedGridOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollMarginRef = useRef(0)
  const [containerWidth, setContainerWidth] = useState(0)

  // Замеряем смещение контейнера от начала документа один раз при монтировании
  useLayoutEffect(() => {
    scrollMarginRef.current = containerRef.current?.offsetTop ?? 0
  }, [])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) {
        setContainerWidth(width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const columns =
    containerWidth > 0 ? Math.max(1, Math.floor((containerWidth + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP))) : 1
  const cardWidth = columns > 0 ? (containerWidth - GRID_GAP * (columns - 1)) / columns : MIN_CARD_WIDTH
  const rowCount = Math.ceil(itemCount / columns)

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => estimateSize(cardWidth),
    overscan,
    scrollMargin: scrollMarginRef.current,
  })

  return { containerRef, columns, cardWidth, rowVirtualizer }
}
