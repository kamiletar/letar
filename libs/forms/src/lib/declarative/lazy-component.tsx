'use client'

import { Skeleton } from '@chakra-ui/react'
import { createLazyComponent as createLazyComponentBase } from '@letar/forms-react'
import type { ComponentProps, ComponentType } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>

type LazyImportFn<T> = () => Promise<{ default: T } | T>

/**
 * Creates ленивый component с встроенным Suspense и Skeleton fallback (Chakra-скин).
 *
 * Supports как default export, так и named export (object модуля).
 *
 * Общая логика (mounted-гейт + Suspense, фикс зависшего серверного Suspense-boundary на rAF в
 * скрытой/фоновой вкладке) вынесена в `@letar/forms-react` — здесь только Chakra `Skeleton` как
 * fallback. Разбор бага — `.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md`.
 */
export function createLazyComponent<T extends AnyComponent>(
  importFn: LazyImportFn<T>,
  fallbackHeight = '40px',
): ComponentType<ComponentProps<T>> {
  return createLazyComponentBase(importFn, () => <Skeleton height={fallbackHeight} borderRadius="md" />)
}

/**
 * Преобразует object с функциями динамического импорта в object с lazy компоненthereи
 *
 * @example
 * ```tsx
 * const lazySelects = createLazyComponents({
 *   Type: () => import('./select-type').then(m => m.SelectType),
 *   Status: () => import('./select-status').then(m => m.SelectStatus),
 * })
 *
 * // Result:
 * lazySelects.Type // LazyWrapper с встроенным Suspense
 * lazySelects.Status // LazyWrapper с встроенным Suspense
 * ```
 */
export function createLazyComponents<T extends Record<string, LazyImportFn<AnyComponent>>>(
  imports: T,
  fallbackHeight = '40px',
): { [K in keyof T]: AnyComponent } {
  return Object.entries(imports).reduce(
    (acc, [name, importFn]) => ({
      ...acc,
      [name]: createLazyComponent(importFn, fallbackHeight),
    }),
    {} as { [K in keyof T]: AnyComponent },
  )
}

/** Type for lazy import function */
export type LazyComponentImport<T extends AnyComponent = AnyComponent> = LazyImportFn<T>
