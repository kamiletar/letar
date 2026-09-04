# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.1.7] - 2026-09-04

### Added

- `examples/zenstack` — `Product.sku`/`Product.website` теперь демонстрируют Фазу 1 миграции
  `zenstack-form-plugin` (v2.4.0) на нативные ZModel-атрибуты: `@startsWith`/`@trim`/`@upper` на
  `sku`, `@url` на `website`. Валидация целиком приходит из `schema.zmodel`, ни строчки ручного
  Zod на этой странице.

## [0.1.6] - 2026-09-02

### Fixed

- `robots.ts` уже использовал `@letar/seo` (`isProductionDomain()`) корректно, но
  `NEXT_PUBLIC_BASE_URL` не была проброшена ни в один из compose-файлов и env — гейт был
  no-op, staging (`form-example-stage.s3.letar.best`) индексировался наравне с продом. Добавлена
  переменная в `docker-compose.staging.yml`/`docker-compose.production.yml` и
  `.env.staging.enc`/`.env.docker.enc` (§33 `PLAN-INFRA-2.md`).

## [0.1.5] - 2026-09-02

### Added

- `public/llms.txt` — карта публичных разделов для LLM-агентов (llmstxt.org), см.
  [.claude/docs/llms-txt-pattern.md](../../.claude/docs/llms-txt-pattern.md).

## [0.1.4] - 2026-09-01

### Fixed

- `@letar/demo-protection` резолвился только через `nx.implicitDependencies`, не был в
  `dependencies` — под изолированным линковщиком bun это тихо ронял `typecheck:tsgo` с
  `TS2307: Cannot find module '@letar/demo-protection'`. Добавлен в `dependencies`.

## [0.1.2] - 2026-08-20

### Fixed

- Все 42 examples-страницы получили настоящий `<h1>` — Chakra `Heading` рендерит `<h2>` по
  умолчанию, ни одна страница не имела `<h1>` в DOM. Root cause 5 упавших e2e-спеков (§18.7 M2:
  `basic`/`conditional`/`groups`/`multi-step`/`validation`, все проверяют
  `getByRole('heading', {level: 1})`). Добавлен общий `PageH1` (`asChild` + нативный `<h1>`).

## [0.1.1] - 2026-04-04

### Improved

- Обновлён PLAN.md — цели синхронизированы с библиотекой v0.84.2 (56 полей)
- 42 демо-страницы покрывают все основные паттерны

## [0.1.0] - 2026-03-23

### Added

- Showcase приложение @letar/forms
- 11 демо-страниц (basic, all-fields, validation, conditional, multi-step, groups, auto-fields, zenstack, theming, i18n, offline)
- ZenStack интеграция с `schema.zmodel` и `@form.*` директивами
- Docker деплой на forms-example.letar.best (порт 3022)
