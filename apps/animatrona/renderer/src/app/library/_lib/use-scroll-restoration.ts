'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

/** Ключ для sessionStorage — по аналогии с FILTERS_STORAGE_KEY в useFilterParams */
const SCROLL_STORAGE_KEY = 'animatrona:library:scroll'

type ScrollMap = Record<string, number>

function readScrollMap(): ScrollMap {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? '{}') as ScrollMap
  } catch {
    return {}
  }
}

/**
 * Восстановление позиции скролла страницы библиотеки при возврате назад.
 *
 * Список виртуализирован через `useWindowVirtualizer` — итоговая высота контента
 * уточняется через `measureElement` уже после первых кадров рендера, поэтому
 * однократный `scrollTo` сразу после монтирования промахивается. Решение — несколько
 * попыток восстановления через `requestAnimationFrame`, пока высота не устаканится.
 *
 * @param ready Контент загружен и готов к измерению (обычно `!isLoading`)
 * @param variant Дополнительный ключ для разделения позиций между режимами
 *   отображения (`individual`/`franchise`) — у них разная высота строк
 */
export function useScrollRestoration(ready: boolean, variant?: string) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const key = `${pathname}?${searchParams.toString()}#${variant ?? ''}`
  const restoredKeyRef = useRef<string | null>(null)

  // Восстановление — один раз на ключ (страница+фильтры+режим), когда контент готов
  useEffect(() => {
    if (!ready || restoredKeyRef.current === key) {
      return
    }
    restoredKeyRef.current = key

    const saved = readScrollMap()[key]
    if (!saved) {
      return
    }

    let attempts = 0
    const tryScroll = () => {
      window.scrollTo(0, saved)
      attempts += 1
      if (attempts < 5) {
        requestAnimationFrame(tryScroll)
      }
    }
    requestAnimationFrame(tryScroll)
  }, [ready, key])

  // Непрерывное сохранение текущей позиции скролла
  useEffect(() => {
    let rafId: number | null = null
    const handleScroll = () => {
      if (rafId != null) {
        return
      }
      rafId = requestAnimationFrame(() => {
        rafId = null
        const map = readScrollMap()
        map[key] = window.scrollY
        try {
          sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(map))
        } catch {
          // Игнорируем ошибки записи (например, приватный режим без sessionStorage)
        }
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId != null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [key])
}
