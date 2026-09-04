# Changelog

## [3.1.0] - 2026-09-04

### Added

- **Кастомный `message` у нативных ZModel-атрибутов валидации** (`@gte(1, "...")`,
  `@length(2, 50, "...")`, `@email("...")` и т.д.) теперь реально попадает в текст ошибки Zod —
  разбор блокера был зафиксирован ещё в Фазе 1 (`libs/forms/PLAN.md`), реализовано следом за
  Фазой 3. Затрагивает все 11 нативных атрибутов Фазы 1 (`@length`, `@startsWith`, `@endsWith`,
  `@contains`, `@regex`, `@email`, `@datetime`, `@date`, `@time`, `@url`, `@phone`) плюс числовые
  `@gte`/`@gt`/`@lte`/`@lt` (`String`/`Int`/`Float`/`BigInt`, включая списки). `@@validate`
  (Фаза 2) не затронут — его `message` уже штатно работал через `ZodUtils.addCustomValidation`.
- Механизм: `ZodUtils.*` (`@zenstackhq/zod`) не читает позиционный аргумент `message` ни в одном
  `case`-ветвлении — находка живым прогоном (не из документации, пакет её не описывает).
  Единственный работающий путь — постфактум-мутация недокументированного внутреннего поля Zod v4
  `check._zod.def.error` **после** того, как `ZodUtils.*` построил схему. Мутация происходит
  позиционно: рантайм-хелпер `applyNativeMessages` (эмитится инлайн в сгенерированный файл, как и
  существующий `withNative`) проходит `schema._zod.def.checks` по индексу, синхронно с порядком
  атрибутов, переданных в `ZodUtils.*` — `ZodUtils.*` вызывает Zod-методы строго в этом порядке.
  Число check'ов на атрибут выводится кодогеном (`deriveNativeCheckCount`, `model-generator.ts`):
  1 для большинства, 0/1/2 для `@length` (независимо min/max).
- ⚠️ **`Int`-поля требуют смещения на 1.** `PRISMA_TO_ZOD['Int']` = `'z.number().int()'` —
  `.int()` сам пушит `number_format`-check ДО того, как `ZodUtils.addNumberValidation` добавит
  свои. Без явного `{ count: 1 }` в начале `entries` (только для `prismaType === 'Int'`) message
  съезжает на чужой check — живьём поймано на демо-поле `Recipe.rating`
  (`apps/form-develop-app/schema.zmodel`): `@lte`-сообщение молча не подставлялось, оставался
  дефолтный текст Zod.
- Canary-тест `zod-native-message-mutation.spec.ts` — фиксирует контракт с текущей версией
  `zod`/`@zenstackhq/zod` напрямую (порядок push checks, факт мутируемости `_zod.def.error`,
  offset `.int()`), а не через сгенерированный код плагина. Апгрейд зависимостей, ломающий этот
  путь, роняет этот файл первым — не молча перестаёт подменять сообщения.
- Живая проверка: `apps/form-develop-app` (`Recipe.website`/`authorPhone`/`rating`) —
  сгенерированная `RecipeCreateFormSchema.safeParse()` с невалидными значениями возвращает именно
  заданный `message`, не дефолтный текст Zod.

### Unchanged

- Синтаксис `@meta` (v3.0.0) не затронут — сообщение задаётся ТОЛЬКО последним позиционным
  аргументом самого нативного ZModel-атрибута (`@gte(1, "текст")`), не через `@meta`.
- `Decimal`-поля вне этой фичи — они не проходят через `ZodUtils.*` (см. v2.4.0/Фаза 0,
  `extractDecimalNativeConstraints`), остаются на прежнем механизме без message.
- i18n-резолюция message (ключ перевода вместо литерала, аналог `i18nKey` у `title`/`placeholder`)
  — НЕ реализована в этой версии, только литеральные строки. Отдельный, ещё не начатый шаг —
  см. `libs/forms/PLAN.md`.

## [3.0.0] - 2026-09-04

### Breaking (по объёму синтаксиса, не по контракту вывода)

- **`@meta("form.<key>", value)` — новый основной синтаксис field-метаданных** (Фаза 3 миграции
  на нативные ZModel-возможности). Заменяет comment-директивы `@form.*` как рекомендуемый способ
  описания форм; сами comment-директивы продолжают работать (deprecated, не удалены — см. ниже).
  Не breaking по факту вывода: сгенерированный `*.form.ts` идентичен между `@form.*` и
  эквивалентным `@meta`-описанием — breaking только в терминологии «основной синтаксис» для
  документации/примеров.
- **Плоский dot-path вместо объектных литералов.** `@meta("key", {...})` роняет `zenstack
  generate` целиком (`Unsupported attribute arg value: ObjectExpr`) — это ограничение
  upstream-генератора TS-схемы ZenStack, не нашего плагина; подтверждено живым прогоном.
  Поэтому `form.props`/`form.relation` задаются не объектом, а серией плоских ключей:
  `@form.props({ min: 1, max: 100 })` → `@meta("form.props.min", 1) @meta("form.props.max", 100)`.
  Поддержаны значения: строка, число, булево, массив (рекурсивно для вложенных массивов) —
  не объект.
- Ключи: `form.title`, `form.placeholder`, `form.description`, `form.fieldType` (строка),
  `form.exclude` (булево, по умолчанию `true` без явного значения), `form.props.<dotpath>`,
  `form.relation.<dotpath>` (замена `{model, labelField}`).

### Added

- `parseMetaAttributes(attributes)` (`parser.ts`) — AST-парсер `@meta`-атрибутов поля, минуя
  comment-регексы: работает напрямую с `DataFieldAttribute[]` из Langium AST.
- `mergeFormMeta(commentMeta, metaAttrMeta)` — слияние старого comment-парсинга и нового
  `@meta`-парсинга **по отдельным полям метаданных**, не объекта целиком: `@meta` побеждает при
  конфликте на уровне конкретного ключа (`title`/`placeholder`/…), `constraints`/`props`
  мержатся key-by-key с приоритетом `@meta`.
- Deprecation-warning в консоль `nx zenstack:generate` для каждого поля, всё ещё использующего
  comment-директиву `@form.*` — с подсказкой готового `@meta`-эквивалента. Не ломает сборку.
- `scripts/codemods/codemod-form-directives.mjs` — консервативный построчный кодмод
  `@form.*` → `@meta(...)`. Конвертирует только однозначно распознанные директивы; двусмысленные
  случаи (позиционные аргументы, объекты, которые не распарсились) оставляет как есть и печатает
  список на ручную проверку. Идемпотентен. Применён к `apps/form-develop-app` (30 директив, 2
  случая — ручной фикс мёртвой позиционной формы `@form.relation`) и `apps/form-example`
  (32 директивы, 0 случаев на ручную проверку).
- Найден и исправлен побочным эффектом обзора реального использования: `Recipe.category` в
  `form-develop-app` использовал позиционный `@form.relation("Category", "name")` — синтаксис,
  который парсер плагина никогда не поддерживал (только объектный литерал), т.е. relation-select
  для этого поля никогда не рендерился. Переведён на `@meta("form.relation.model", "Category")
  @meta("form.relation.labelField", "name")`.

### Unchanged

- Comment-директивы `@form.*` полностью работают, ничего не удалено. `libs/forms/PLAN.md`
  предполагает их фактическое удаление отдельной, будущей мажорной фазой — не в рамках этой.

## [2.5.0] - 2026-09-04

### Added

- **`@@validate(condition, message?, path?)` — кросс-полевая валидация модели** (Фаза 2 миграции
  на нативные ZModel-возможности). Условие — произвольное булево выражение ZModel (сравнения,
  логика, вызовы `length`/`startsWith`/... над полями модели), сериализуется в рантайм-контракт
  `Expression` пакета `@zenstackhq/zod` (`serializeExpression`, рекурсивный обход AST-узлов
  Langium по `$type`: `BooleanLiteral`/`NumberLiteral`/`StringLiteral`/`ReferenceExpr`/
  `ThisExpr`/`NullExpr`/`UnaryExpr`/`BinaryExpr`/`ArrayExpr`/`InvocationExpr`) и применяется как
  `.refine()` через `ZodUtils.addCustomValidation` (уже существующий API `@zenstackhq/zod`, не
  наш). `MemberAccessExpr` намеренно не поддержан — в `@@validate` моделей форм-плагина не
  встречался, попытка сериализовать бросает понятную ошибку кодогена вместо тихой порчи
  рантайма.
- **`@@validate` и Update-схема**: кросс-полевая проверка применяется только к `{Model}CreateFormSchema`.
  Update-схема (`.partial()`) строится из внутреннего, не экспортируемого `{Model}BaseSchema` —
  результат `.refine()` (`ZodEffects`) не имеет метода `.partial()`, а partial-payload часто не
  может удовлетворять инварианту, рассчитанному на полную модель. `presentFields`-параметр
  `ZodUtils.addCustomValidation` (частичная проверка «только если оба поля присутствуют») в MVP
  не подключён — намеренно вне объёма Фазы 2.
- `ModelValidation` (`types.ts`) — новый тип, `ModelInfo.validations?: ModelValidation[]`.

### Investigated, not shipped

- **`@@strict()` (`z.strictObject` вместо `z.object`) — реализован в кодогене
  (`ModelInfo.isStrict`, `hasStrictAttr`), но не может быть использован ни на одной `model`.**
  Живой прогон `zenstack generate` подтвердил: стандартная библиотека ZModel объявляет
  `attribute @@strict() @@@once @@@validation` разрешённым **только на `type`-определениях**
  (`schema.zmodel:N - attribute "@@strict" can only be used on type definitions`) — на `model` он
  синтаксическая ошибка схемы, а не рантайм-риск, как предполагал `libs/forms/PLAN.md` до этого
  прогона. Код `isStrict`/`objectFn`/`z.strictObject(...)` в `generateModelCode` оставлен как
  переносимая инфраструктура (юнит-тестами покрыт на синтетических `ModelInfo`-фикстурах — они не
  идут через реальный парсер и потому не ловят это ограничение), но для `model` де-факто мёртв,
  пока ZenStack не расширит область действия атрибута. Задел на будущее — не долг Фазы 2.

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
