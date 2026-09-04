'use client'

import NextTopLoader from 'nextjs-toploader'
import { useSyncExternalStore } from 'react'

export interface TopLoaderProps {
  /** Цвет индикатора (HEX). Если не указан — дефолт библиотеки */
  color?: string
  /** Высота индикатора в пикселях. По умолчанию: 3 */
  height?: number
  /** Показывать спиннер. По умолчанию: false */
  showSpinner?: boolean
}

/**
 * Компонент индикатора загрузки страницы (top progress bar).
 *
 * Обёрнут в client-only рендеринг для предотвращения hydration mismatch.
 * Поддерживает кастомизацию цвета и высоты для разных приложений.
 *
 * @example
 * // Pravda (красный)
 * <TopLoader color="#E53E3E" />
 *
 * // Driving School (синий)
 * <TopLoader color="#3182CE" />
 *
 * // Default (библиотечный дефолт)
 * <TopLoader />
 */
// Гидратация — не производное значение и не асинхронное событие: на сервере и при первом
// клиентском рендере компонент обязан вернуть одинаковую разметку (`null`), иначе hydration
// mismatch, а показать индикатор можно только после того, как React подтвердил совпадение дерева.
// `useSyncExternalStore` с фиксированным `getServerSnapshot` — штатный примитив React 18+ именно
// для этого случая, без `useEffect`+`setState` и лишнего цикла рендера после монтирования.
const subscribeNoop = () => () => {}
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )
}

export function TopLoader({ color, height = 3, showSpinner = false }: TopLoaderProps) {
  const mounted = useIsHydrated()

  if (!mounted) {
    return null
  }

  return (
    <NextTopLoader
      color={color}
      initialPosition={0.08}
      crawlSpeed={200}
      height={height}
      crawl={true}
      showSpinner={showSpinner}
      easing="ease"
      speed={200}
      shadow={color ? `0 0 10px ${color}, 0 0 5px ${color}` : undefined}
    />
  )
}
