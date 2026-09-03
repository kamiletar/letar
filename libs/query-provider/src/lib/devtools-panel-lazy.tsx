'use client'

import dynamic from 'next/dynamic'

/** В production панель не существует — рендерить нечего. */
function NoDevtools() {
  return null
}

/**
 * Панель TanStack DevTools, вырезаемая из production-сборки **на этапе компиляции**.
 *
 * ⚠️ Одного `dynamic(() => import(...), { ssr: false })` для этого недостаточно, хотя выглядит
 * достаточным: `ssr: false` управляет рендерингом, но не резолвом импортов — модуль всё равно
 * компилируется в серверный слой, и там `@tanstack/devtools-ui` берёт `solid-js/web` по
 * серверному условию `exports`, где нет экспорта `use`:
 *
 * ```
 * Attempted import error: 'use' is not exported from 'solid-js/web' (imported as 'use').
 * ```
 *
 * Сборка падает целиком, при исправном рантайме и исправных версиях (`solid-js@1.9.12`
 * удовлетворяет `^1.9.9`, который просит `@tanstack/devtools-ui`) — дело не в версиях, а в том,
 * какой билд solid-js достаётся серверной компиляции. Класс ловушки описан в
 * `.claude/docs/nextjs-dynamic-ssr-false-still-server-compiled.md`.
 *
 * Лечение — сравнение с `process.env.NODE_ENV`, которое Next подставляет литералом на этапе
 * сборки: ветка с `import()` становится мёртвой, и бандлер выбрасывает её вместе со всем
 * поддеревом зависимостей, не пытаясь его резолвить. Условие обязано остаться на верхнем уровне
 * модуля — внутри компонента бандлер его так не свернёт.
 *
 * Проверять правку только прод-сборкой (`nx build <app>`): в dev живая ветка та же, что и была,
 * поэтому ошибка не проявляется ни при `nx dev`, ни в `typecheck`, ни в `lint`.
 */
export const DevtoolsPanel = process.env.NODE_ENV === 'production'
  ? NoDevtools
  : dynamic(() => import('./devtools-panel').then((m) => m.DevtoolsPanel), { ssr: false })
