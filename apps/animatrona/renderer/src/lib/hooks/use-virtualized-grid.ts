'use client'

import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

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
  const scrollMarginRef = useRef(0)
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Callback-ref вместо useRef+useLayoutEffect([]) — контейнер монтируется не сразу
  // (пока isLoading=true, компоненты рендерят скелетон без этого элемента), а effect
  // с пустыми deps срабатывает лишь один раз при первом маунте и не подхватит элемент,
  // появившийся позже. Callback-ref вызывается заново при каждом реальном монтировании узла.
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    setContainerEl(el)
    if (el) {
      scrollMarginRef.current = el.offsetTop
    }
  }, [])

  useLayoutEffect(() => {
    if (!containerEl) {
      return
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) {
        setContainerWidth(width)
      }
    })
    observer.observe(containerEl)
    return () => observer.disconnect()
  }, [containerEl])

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
