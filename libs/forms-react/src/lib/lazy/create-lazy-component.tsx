'use client'

import type { ComponentProps, ComponentType, ReactNode } from 'react'
import { lazy, Suspense, useEffect, useState } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>

type LazyImportFn<T> = () => Promise<{ default: T } | T>

/**
 * Создаёт ленивый компонент со встроенным Suspense и клиентским mounted-гейтом.
 *
 * Поддерживает как default export, так и named export (object модуля).
 *
 * ⚠️ Suspense-дерево монтируется только после клиентского маунта (гейт `mounted`), сервер всегда
 * отдаёт только `fallback` без Suspense-обёртки вокруг него. Иначе SSR-стриминг оборачивает
 * ленивый импорт в серверный Suspense-boundary, чьё раскрытие React делает через встроенный
 * `$RC`/`$RB`/`$RV` reveal-script — а он батчит swap через `requestAnimationFrame`. Если rAF не
 * тикает (свёрнутая/фоновая/скрытая вкладка — типичное состояние headless-браузера в e2e), boundary
 * виснет в `<template id="B:N">` навсегда: реальная разметка лежит в осиротевшем `<div hidden
 * id="S:N">` в конце `<body>`, DOM формально валиден, ошибок в консоли нет. Гейт полностью убирает
 * зависимость от серверного reveal — ленивый импорт запускается и Suspend-ится целиком на клиенте
 * обычным React-коммитом, не через HTML-патчинг стрима. Разбор —
 * `.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md`.
 *
 * `fallback` передаётся снаружи (не хардкодится) — этот слой не знает ни одной UI-библиотеки,
 * скины (`@letar/forms` на Chakra, `@letar/forms-shadcn` на Radix/tailwind) рисуют его сами.
 */
export function createLazyComponent<T extends AnyComponent>(
  importFn: LazyImportFn<T>,
  fallback: ReactNode,
): ComponentType<ComponentProps<T>> {
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
  function LazyWrapper(props: ComponentProps<T>) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
      setMounted(true)
    }, [])

    if (!mounted) {
      return fallback
    }

    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }

  LazyWrapper.displayName = `Lazy(${importFn.name || 'Component'})`

  return LazyWrapper
}

/** Type for lazy import function */
export type LazyComponentImport<T extends AnyComponent = AnyComponent> = LazyImportFn<T>
