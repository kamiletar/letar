# Changelog — aira-web

## [0.3.5] — 2026-08-25

### Fixed

- Touch target (WCAG 2.5.5): ссылка «← Aira» на `/privacy` и ссылка «Privacy» в футере были
  ниже 44px по высоте. `TouchLink` из `@letar/ui` заменить нельзя — он жёстко использует
  `next/link`, а aira-web роутит через locale-aware `Link` из `@/i18n/navigation`
  (`createNavigation` next-intl). Решение по образцу mandala/archetest: `minH="2.75rem"
  alignItems="center"` прямо на `<Link asChild>` (Chakra Link), без импорта TouchLink.

## [0.3.4] — 2026-08-25

### Fixed

- `CookieBanner` в `[locale]/layout.tsx` рендерился сиблингом после `</Providers>`, а не
  потомком — Chakra-компоненты внутри баннера падали `ContextError` вне дерева
  `RootChakraProvider`, как только эффект выставлял `shown = true`. Перенесён внутрь
  `<Providers>`/`<NextIntlClientProvider>`.

## [0.3.3] — 2026-08-21

### Fixed

- `config.matcher` в `proxy.ts` заменён с вызова `buildIntlMatcher()` на литерал массива — Next.js
  статически парсит `config.matcher` через AST на build-time без исполнения модуля, вызов функции
  ломал `next build`.

## [0.3.1] — 2026-07-30

### Изменено

- Проработана архитектура браузерного демо Aira — `PLAN.md`, Фаза 2. Кода нет: ждём
  Milestone 14 в репозитории `kamiletar/aira` (npm-пакет `aira-wasm`)
- Решения владельца: демо — отдельное приложение `aira-try` на поддомене (порт 3031),
  интерфейс на React/Chakra вместо egui, движок десктопа Tauri v2, граница репозиториев
  «Rust в aira, React в letar»
- `PLAN.md` вычищен от устаревших пунктов: лендинг, навигация и SEO давно сделаны —
  перенесены в `PLAN_COMPLETED.md` задним числом

## [0.1.0] — 2026-04-10

### Добавлено

- Инициализация приложения Next.js 16 + Chakra UI v3
- Тема: brand teal, accent purple с dark mode
- MDX поддержка
- Umami аналитика
- Главная страница-заглушка
