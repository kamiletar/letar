'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { PvzMapProps } from './pvz-map'

/**
 * Карта ПВЗ для публичного входа `@letar/cdek/client`.
 *
 * Прямой реэкспорт `./pvz-map` заставляет сервер выполнить модуль Leaflet при SSR любой страницы,
 * которая импортирует этот вход (даже если сама карта не рендерится): Leaflet обращается к
 * `window` на верхнем уровне модуля → `ReferenceError: window is not defined`, страница отдаёт 500.
 * Ленивая загрузка с `ssr: false` оставляет Leaflet только в браузере.
 */
export const PvzMap: ComponentType<PvzMapProps> = dynamic(
  () => import('./pvz-map').then((m) => ({ default: m.PvzMap })),
  { ssr: false },
)
