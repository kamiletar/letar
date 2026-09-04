# Changelog

## [2.3.0] - 2026-09-04

### Added

- **Наследование нативных ZModel-атрибутов валидации** (`@email`, `@length`, `@gte`/`@gt`/`@lte`/
  `@lt`, `@regex`) в Zod-constraints генерируемой формы. Раньше `model-generator.ts` читал
  ограничения только из `@form.props({...})` (comment-парсинг) — поле с одним лишь нативным
  атрибутом получало форму без клиентской валидации, хотя ORM честно применяла его на
  `create`/`update` через `@zenstackhq/zod`. `@form.props` побеждает при конфликте того же ключа
  на одном поле (осознанный escape hatch, не миграция существующих 29+ мест).
- `ZodConstraints.exclusiveMin`/`exclusiveMax` — отдельные ключи для `@gt`/`@lt` (Zod `.min()`/
  `.max()` включительны и соответствуют только `@gte`/`@lte`; exclusive-границы генерируют
  `.gt()`/`.lt()`).

### Changed

- `README.md` — секция про `@form.props` переписана: нативные атрибуты — рекомендуемый путь,
  `@form.props` для constraints — escape hatch с тремя задокументированными случаями законного
  использования (per-consumer override общей схемы, валидация до/после нормализации, staged
  rollout серверного ограничения). UI-пропсы в `@form.props` не изменились.

## [2.2.1] - 2026-08-09

### Fixed

- **`build:npm` мог опубликовать пакет со старой версией.** `dist/package.json` копировался
  голым `cp` из `package.publish.json`, у которого было собственное поле `version`, независимое
  от `package.json` — на момент находки разошлись (`1.0.1` против `2.2.0`). Тот же класс ошибки,
  что уже чинили в `@letar/forms`. Фикс — `version` убрано из `package.publish.json` вовсе,
  `dist/package.json` теперь собирает `scripts/write-publish-package-json.mjs` (мёржит шаблон
  `package.publish.json` с актуальной версией из `package.json`), рассинхрон структурно
  невозможен.

## [2.2.0] - 2026-03-31

### Added

- `validationTranslationsPath` plugin option for custom validation translations
- Built-in validation translations for en and ru as `BUILTIN_TRANSLATIONS`
- `ValidationTranslations` type exported from package
- `build:npm` target for npm publishing
- `README.en.md` with English documentation

### Changed

- Default locale changed from `'ru'` to `'en'`
- All JSDoc and comments translated to English
- Generated code comments: `@letar/` → `@letar/`
- `isRussian` hardcode → extensible `getValidationTranslations()` with fallback chain
- `README.md` updated: explicit `defaultLocale = 'ru'` for Russian users

## [1.0.0] - 2026-03-31

### Features

- Generate Zod v4 schemas with `.meta({ ui: {...} })` from `schema.zmodel`
- Support `@form.*` directives: title, placeholder, description, fieldType, props, relation, exclude
- Auto-split `@form.props` into Zod constraints (min, max, email) and UI props (count, showValue)
- Enum generation with labels from `///` doc comments
- Model generation with Create/Update schemas and excluded fields list
- i18n support: generate translation JSON files per locale with merge strategy
- Auto-exclude: id, createdAt, updatedAt, @relation fields
- Compatible with `@letar/forms` (`Form.FromSchema`, `Form.Field.*`)
