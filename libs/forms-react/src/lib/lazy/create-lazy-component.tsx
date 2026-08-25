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
 *
 * ⚠️ `fallback` — фабрика (`() => ReactNode`), не готовый элемент. Готовый JSX-элемент,
 * созданный на верхнем уровне модуля (в момент вызова `createLazyComponent(...)`, а не в
 * рендере), исполняется сразу при импорте модуля — в том числе вне Next.js/React-рантайма,
 * например при импорте формы из `prisma/seed.ts` под `tsx`. Next.js собирает JSX в automatic
 * runtime независимо от `tsconfig`, а `tsx`/esbuild под `"jsx": "preserve"` (пресет
 * `tsconfig.next-app.json` для самого Next.js) транспилирует JSX в classic
 * `React.createElement(...)` — модуль без `import React` падает `ReferenceError: React is not
 * defined` при обычном импорте, до всякого рендера. Фабрика делает то же самое, что и раньше,
 * но только внутри `LazyWrapper` на клиенте — там, где React-рантайм уже гарантированно есть.
 * Разбор — `.claude/docs/letar-forms-lazy-component-eager-jsx-seed-crash.md`.
 */
export function createLazyComponent<T extends AnyComponent>(
  importFn: LazyImportFn<T>,
  fallback: () => ReactNode,
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
      return fallback()
    }

    return (
      <Suspense fallback={fallback()}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }

  LazyWrapper.displayName = `Lazy(${importFn.name || 'Component'})`

  return LazyWrapper
}

/** Type for lazy import function */
export type LazyComponentImport<T extends AnyComponent = AnyComponent> = LazyImportFn<T>
