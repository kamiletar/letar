# Changelog

## [2.4.0] - 2026-09-04

### Added

- **Фаза 1 миграции на нативные ZModel-атрибуты (паритет с ORM)** — 11 новых атрибутов
  валидации теперь наследуются генератором форм наравне с уже поддержанными `@email`/`@length`/
  `@gte`/`@gt`/`@lte`/`@lt`/`@regex`: `@startsWith`, `@endsWith`, `@contains`, `@datetime`,
  `@date`, `@time`, `@url`, `@phone`, `@trim`, `@lower`, `@upper`. Как и раньше — `@form.props`
  побеждает при конфликте того же ключа на одном поле.
- **`@omit`/`@computed` теперь исключают поле из формы**, как и `@form.exclude` — `@omit`
  скрывает поле из ORM-клиента целиком, `@computed` помечает поле как вычисляемое сервером,
  ни то ни другое не должно быть доступно для пользовательского ввода.
- **Архитектура применения (A3, решение Фазы 0 spike, `libs/forms/PLAN.md`)**: для
  `String`/`Int`/`Float`/`BigInt`-полей (включая списки) нативные атрибуты сериализуются в
  сгенерированном файле как инлайновый литерал `AttributeApplication[]` и применяются через
  `ZodUtils.addStringValidation`/`addNumberValidation`/`addBigIntValidation`/`addListValidation`
  из `@zenstackhq/zod`, обёрнутые в типизированный хелпер `withNative(...)` — без него
  `ZodUtils.*` стирает конкретный тип схемы до базового `z.ZodSchema`, и `z.infer` вырождается в
  `unknown` (находка Фазы 0 spike, эмпирически подтверждена forced-mismatch тестом на `tsgo`).
  `ZodUtils`-импорт и хелпер эмитятся только в файлах моделей, где нативные атрибуты реально
  есть — decimal.js внутри `ZodUtils` не тянется в модели без него.
- **`Decimal`-поля остаются на прежнем механизме** (constraints + `generateConstraints`) — Фаза 0
  spike подтвердила несовместимость: `ZodUtils.addDecimalValidation` трансформирует
  `string → Decimal`-инстанс, а контракт формы для Decimal — `Decimal → z.number()`.
- `peerDependencies`: добавлена `@zenstackhq/zod` (`>=3.0.0`) — раньше не была объявлена нигде,
  так как использовалась только транзитивно через `@zenstackhq/orm`; для явного `ZodUtils`-импорта
  в сгенерированном коде пакет должен резолвиться от потребителя. Корневой `package.json`
  монорепо дополнен `@zenstackhq/zod` (была только в глубине `node_modules/.bun` внутри `orm`,
  не хоистилась в корень — без явной корневой зависимости `tsgo`/Next.js-сборка потребителя не
  находила модуль).

### Changed

- `ZodConstraints`/`FormFieldMeta` (`types.ts`): добавлены ключи `startsWith`/`endsWith`/
  `contains`/`datetime`/`date`/`time`/`phone`/`trim`/`lower`/`upper` (для `@form.props`-
  переопределения) и новое поле `formMeta.nativeAttributes` (сериализованные атрибуты для A3).
- **Внутренний рефакторинг-унификация**: обработка всех non-Decimal атрибутов (включая ранее
  поддержанные `@email`/`@length`/`@regex`/`@gte`/`@gt`/`@lte`/`@lt`) переведена с прежнего
  строкового `constraints`-пути на единый механизм A3 — избегает поддержки двух параллельных
  систем рендера валидации. Публичный контракт плагина (`@form.*`-директивы, генерируемый API
  форм) не изменился; изменились только внутренние структуры `formMeta` — не публичный API
  пакета.

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
