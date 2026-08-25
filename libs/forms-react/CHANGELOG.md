# Changelog

Все значимые изменения в библиотеке @letar/forms-react документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.3.2] - 2026-08-25

### Changed

- **BREAKING (внутренний API): `createLazyComponent(importFn, fallback)` — `fallback` теперь
  фабрика `() => ReactNode`, не готовый `ReactNode`.** Готовый JSX-элемент, переданный вызывающей
  стороной, создаётся ДО вызова `createLazyComponent` — на верхнем уровне модуля, в момент его
  импорта, а не в рендере. Под Next.js это незаметно (automatic JSX runtime), но под `tsx`
  (`prisma/seed.ts`) с `tsconfig` Next.js-приложения (`"jsx": "preserve"`) esbuild транспилирует
  такой JSX в classic `React.createElement(...)`, и модуль без `import React` падает
  `ReferenceError: React is not defined` прямо при импорте `@letar/forms`. Фабрика откладывает
  создание элемента до рендера `LazyWrapper` — там React-рантайм есть гарантированно. Разбор —
  [letar-forms-lazy-component-eager-jsx-seed-crash.md](/.claude/docs/letar-forms-lazy-component-eager-jsx-seed-crash.md).

## [0.3.1] - 2026-08-20

### Added

- **`createLazyComponent`** — общий React-хелпер для ленивых компонентов с mounted-гейтом
  (Suspense монтируется только после клиентского маунта). Вынесен из `@letar/forms` (Chakra-скин,
  v2.7.1), где та же логика была продублирована руками в `@letar/forms-shadcn`
  (`FieldDataGrid`/`FieldRichText`, v0.33.3) — теперь оба скина используют одну реализацию.
  `fallback` передаётся снаружи как `ReactNode` (не хардкодится), т.к. этот слой не знает ни одной
  UI-библиотеки. Разбор бага — `.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md`.
