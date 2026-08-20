# Changelog

Все значимые изменения в библиотеке @letar/forms-react документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.3.1] - 2026-08-20

### Added

- **`createLazyComponent`** — общий React-хелпер для ленивых компонентов с mounted-гейтом
  (Suspense монтируется только после клиентского маунта). Вынесен из `@letar/forms` (Chakra-скин,
  v2.7.1), где та же логика была продублирована руками в `@letar/forms-shadcn`
  (`FieldDataGrid`/`FieldRichText`, v0.33.3) — теперь оба скина используют одну реализацию.
  `fallback` передаётся снаружи как `ReactNode` (не хардкодится), т.к. этот слой не знает ни одной
  UI-библиотеки. Разбор бага — `.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md`.
