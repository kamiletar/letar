'use client'

/**
 * Хук для навигации между мандалами в fullscreen режиме.
 */

import { useCallback, useMemo, useState } from 'react'
import type { AdjacentMandala } from '../_components/mandala-navigation'

interface UseMandalaNavigationOptions {
  /** Все мандалы для навигации */
  allMandalas: AdjacentMandala[]
  /** Начальный индекс */
  initialIndex: number
}

interface UseMandalaNavigationResult {
  /** Текущий индекс мандалы */
  currentIndex: number
  /** Текущая отображаемая мандала */
  displayedMandala: AdjacentMandala
  /** Предыдущая мандала (с циклом) */
  prevMandala: AdjacentMandala
  /** Следующая мандала (с циклом) */
  nextMandala: AdjacentMandala
  /** Навигация к мандале по slug */
  navigateToMandala: (slug: string) => void
  /** Установить индекс напрямую */
  setCurrentIndex: (index: number) => void
}

/**
 * Управляет навигацией между мандалами с циклическим переходом.
 */
export function useMandalaNavigation({
  allMandalas,
  initialIndex,
}: UseMandalaNavigationOptions): UseMandalaNavigationResult {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Текущая мандала
  const displayedMandala = useMemo(() => allMandalas[currentIndex] || allMandalas[0], [allMandalas, currentIndex])

  // Предыдущая мандала (с циклом на последнюю)
  const prevMandala = useMemo(
    () => (currentIndex > 0 ? allMandalas[currentIndex - 1] : allMandalas[allMandalas.length - 1]),
    [allMandalas, currentIndex]
  )

  // Следующая мандала (с циклом на первую)
  const nextMandala = useMemo(
    () => (currentIndex < allMandalas.length - 1 ? allMandalas[currentIndex + 1] : allMandalas[0]),
    [allMandalas, currentIndex]
  )

  // Навигация по slug (обновляет URL без перезагрузки)
  const navigateToMandala = useCallback(
    (slug: string) => {
      const newIndex = allMandalas.findIndex((m) => m.slug === slug)
      if (newIndex !== -1) {
        setCurrentIndex(newIndex)
        // Обновляем URL без перезагрузки страницы
        window.history.replaceState({}, '', `/mandalas/${slug}`)
      }
    },
    [allMandalas]
  )

  return {
    currentIndex,
    displayedMandala,
    prevMandala,
    nextMandala,
    navigateToMandala,
    setCurrentIndex,
  }
}
