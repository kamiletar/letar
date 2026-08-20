'use client'

import { Skeleton } from '@chakra-ui/react'
import type { ComponentType } from 'react'
import { lazy, Suspense, useEffect, useState } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>

type LazyImportFn<T> = () => Promise<{ default: T } | T>

/**
 * Creates ленивый component с встроенным Suspense и Skeleton fallback
 *
 * Supports как default export, так и named export (object модуля)
 *
 * ⚠️ Suspense-дерево монтируется только после клиентского маунта (гейт `mounted`), сервер всегда
 * отдаёт только `Skeleton` без Suspense-обёртки вокруг него. Иначе SSR-стриминг оборачивает
 * ленивый импорт в серверный Suspense-boundary, чьё раскрытие React делает через встроенный
 * `$RC`/`$RB`/`$RV` reveal-script — а он батчит swap через `requestAnimationFrame`. Если rAF не
 * тикает (свёрнутая/фоновая/скрытая вкладка — типичное состояние headless-браузера в e2e), boundary
 * виснет в `<template id="B:N">` навсегда: реальная разметка лежит в осиротевшем `<div hidden
 * id="S:N">` в конце `<body>`, DOM формально валиден, ошибок в консоли нет. Гейт полностью убирает
 * зависимость от серверного reveal — ленивый импорт запускается и Suspend-ится целиком на клиенте
 * обычным React-коммитом, не через HTML-патчинг стрима. Разбор —
 * `.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md`.
 */
export function createLazyComponent<T extends AnyComponent>(
  importFn: LazyImportFn<T>,
  fallbackHeight = '40px',
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(async () => {
    const module = await importFn()
    // Поддержка default и named exports
    if (module && typeof module === 'object' && 'default' in module) {
      return module as { default: T }
    }
    // Если вернули сам component (named export)
    return { default: module as T }
  })

  // Wrapper с Suspense — монтируется только на клиенте, см. комментарий выше
  function LazyWrapper(props: React.ComponentProps<T>) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
      setMounted(true)
    }, [])

    if (!mounted) {
      return <Skeleton height={fallbackHeight} borderRadius="md" />
    }

    return (
      <Suspense fallback={<Skeleton height={fallbackHeight} borderRadius="md" />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }

  LazyWrapper.displayName = `Lazy(${importFn.name || 'Component'})`

  return LazyWrapper
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
