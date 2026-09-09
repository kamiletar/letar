# Changelog

Все значимые изменения в библиотеке @letar/forms-react документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.7.0] - 2026-09-09

### Added

- **`useResolvedFieldProps` резолвит `meta.fieldProps` из `schema.zmodel`** —
  `@meta("form.props.<key>", value)` теперь работает одинаково и через `Form.Field.Auto`
  (уже умел это раньше через `renderFieldByType`), и через явные типизированные теги
  (`<AppForm.Field.Currency name="x" />`), рекомендованный в `.claude/rules/forms.md` паттерн.
  Раньше произвольный `fieldProps` резолвился только в первом пути — значения вроде
  `minorUnitScale`/`currency` (факт о хранении данных, не о месте рендера) приходилось
  дублировать JSX-пропом в каждом использовании вручную. Хук отдаёт сырой `meta.fieldProps`
  новым полем `fieldProps` в возвращаемом объекте; мерж с приоритетом `props > meta` сделан в
  `createField` (`create-field-primitives.tsx`) — единой точке для обоих UI-скинов
  (`@letar/forms` Chakra и `@letar/forms-shadcn`), так что фикс автоматически действует в
  обоих без отдельной правки скина. Архитектурная коррекция от владельца (Ками) к запросу
  `Field.Percentage.minorUnitScale`, тред agent-mail `money-field-kopecks` — разбор в
  `libs/forms/PLAN.md` Backlog.

## [0.6.1] - 2026-09-08

### Added

- **`TestForm` (`./testing`) — новый `onFormReady?: (form) => void`.** Отдаёт наружу инстанс
  TanStack Form, чтобы спеки UI-скинов могли проверить `form.state.values` после DOM-
  взаимодействия — итоговый контракт значения поля (что реально «отправилось» бы при submit),
  а не только его видимое поведение. Часть unified test-suite для `EditIntentValue<T>` — до
  этого `forms-shadcn` не имел способа проверить финальную форму `{isEdited, value}` без
  полноценного `createForm()`/кнопки submit, которых у поле-only скина нет.

## [0.6.0] - 2026-09-08

### Fixed

- **`FormI18nProvider` `setupZodErrorMap` работает без `t` от приложения.** Раньше флаг был
  бесполезен без next-intl (или другого источника `t`) — `createFormErrorMap({ t })` требовал
  полноценную функцию перевода со своим JSON-словарём, а без неё сообщения об ошибках ПОСЛЕ
  сабмита (`error.issues[0].message` от Zod) оставались на английском дефолте Zod, даже когда
  проактивные constraint hints под полем уже были переведены через один `locale="ru"`. Теперь
  `FormI18nProvider` строит error map из `t` приложения (если задан, пробуется первым) с
  откатом на встроенный ru/en словарь `@letar/forms-core/i18n`
  (`createBuiltinTranslateFunction`) — `setupZodErrorMap` переводит стандартные коды Zod v4
  (`too_small`/`too_big`/`invalid_format`/... с учётом `origin`) сразу по `locale`, без
  next-intl. Найдено на `domwellbes` (Form.Steps пилот на форме дома, 2026-09-07) — подробности
  и разбор двух независимых механизмов в
  [letar-forms-missing-i18nprovider-english-hints.md](/.claude/docs/letar-forms-missing-i18nprovider-english-hints.md).

## [0.5.1] - 2026-09-04

### Changed

- `useEditIntentField` — локальная `getByPath` заменена импортом `getAtPath` из
  `@letar/forms-core/security` (дублировала уже существующую утилиту). Чистый рефакторинг,
  поведение не изменилось.

## [0.5.0] - 2026-09-04

### Added

- **`SensitiveFieldsProvider`/`useRegisterSensitiveField`/`useSensitiveFieldPaths`** —
  реестр «чувствительных» dot-путей текущей формы
  (`libs/forms/PLAN.md` backlog `EditIntentValue<T>`, security-инфраструктура). Поле вроде
  `Form.Field.EditIntent` регистрирует `${fullPath}.value` при монтировании (пока `sensitive`
  истинен), а потребители снимка формы (persistence/`Form.DebugValues`/`Form.UrlSync`) читают
  текущий список реактивно через `useSyncExternalStore` и прогоняют его через
  `redactAtPaths`/`omitAtPaths` (`@letar/forms-core/security`, тот же релиз) перед тем, как
  значение покинет форму. Без `<SensitiveFieldsProvider>` выше по дереву регистрация и чтение —
  no-op с пустым списком, не ошибка: формы без `EditIntentValue` не обязаны знать об этом
  реестре. `useEditIntentField` получил параметр `sensitive?: boolean` (`@default true`) и
  регистрирует свой путь автоматически.

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
