# Changelog

Все значимые изменения в библиотеке @letar/forms-react документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.4.0] - 2026-08-26

### Added

- **`useEditIntentField`** — headless view/edit/focus-контракт для `Form.Field.EditIntent`
  (единая реализация для Chakra-скина `@letar/forms` и `@letar/forms-shadcn`, скины отличаются
  только вёрсткой). Подписывается на значение поля реактивно через `useStore(form.store, ...)`,
  пишет через `form.setFieldValue(fullPath, ...)`. Предназначен для вызова из `useFieldState`
  (`createFieldPrimitives`), а не напрямую внутри render-prop `<form.Field>` — тот вызывается
  TanStack Form из собственного `useMemo`, где хуки недопустимы
  (`Do not call Hooks inside useEffect(...), useMemo(...)`). `startEdit`/`cancelEdit` атомарны
  (пишут `isEdited` и `value` одним вызовом), фокус переводится эффектом после реального
  перехода режима, не синхронно в обработчике клика. Тип `EditIntentValue<T>` и схема
  `editIntentValueSchema()` — в `@letar/forms-core/edit-intent` (0.9.3 → 0.10.0).

## [0.3.3] - 2026-08-25

### Added

- **Таргет `eager-jsx-check`, подключён к `lint`.** Regex-гейт против регресса бага из v0.3.2
  ниже (`fallback` как готовый JSX-элемент на верхнем уровне модуля) — новая plain-JS библиотека
  `@letar/eager-jsx-check`, по образцу `@letar/theme-check`. Прогон на этой библиотеке чистый.

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
