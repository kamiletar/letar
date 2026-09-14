# Changelog

Все значимые изменения в библиотеке @letar/forms-core документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.12.6] - 2026-09-15

### Changed

- **`resolveTranslation` получил опцию `matchMode?: 'exact' | 'prefix'`** — четвёртая копия
  паттерна, приватный `tryTranslate` в `create-form-error-map.ts`, объединена с общим
  примитивом вместо того чтобы оставаться отдельно (см. `[0.12.5]` ниже, где объединение было
  сознательно отложено). `'exact'` (по умолчанию) — прежнее поведение `resolveTranslation`,
  не меняет три существующих места вызова. `'prefix'` — дополнительно отклоняет результат,
  лишь начинающийся с `key` (не только буквально равный ему); включён только в
  `createFormErrorMap`, где `key` — не самодостаточный путь перевода, а один из двух
  кандидатов при построении по частям (`{prefix}.{code}.{origin}` → `{prefix}.{code}`).
  Поведение `createFormErrorMap` не изменилось — тот же набор тестов
  (`create-form-error-map.spec.ts`) зелёный без изменений.

## [0.12.5] - 2026-09-15

### Added

- **`resolveTranslation(t, key, params?)`** (`@letar/forms-core/i18n`) — общий примитив паттерна
  «попробовать `t()`, откатиться на fallback, если перевод пустой/равен ключу/`t` бросил
  исключение» (next-intl сигналит отсутствие перевода возвратом самого ключа). Раньше был
  реализован независимо и почти дословно в трёх местах: `combinedT` и `getLocalizedValue`
  (`@letar/forms-react`), `resolveDefaultErrorsTitle` (`@letar/forms`). Извлечён без изменения
  поведения ни одного из трёх — источники встроенных словарей (`createBuiltinTranslateFunction`,
  локальный `Record`) и дефолты по-прежнему решаются на месте вызова.

### Internal

- `create-form-error-map.ts` не тронут — его приватный `tryTranslate` содержит дополнительную
  проверку `result.startsWith(key)`, которой нет ни в одном из трёх унифицированных мест, и
  унификация с ним не входила в задачу.

## [0.12.4] - 2026-09-14

### Fixed

- **`applyServerErrors` не показывал field-level ошибку визуально** — писал сообщение напрямую
  в плоский `meta.errors` поля, а TanStack Form (`@tanstack/form-core`) держит `meta.errors` как
  ПРОИЗВОДНОЕ значение, пересчитываемое из `meta.errorMap` при каждом обновлении стора
  (`Object.values(errorMap)...`, `FormApi.js`) — в том числе при самом вызове `setFieldMeta`.
  Прямой push переживал ровно до следующего пересчёта (на живой странице — тот же тик), поэтому
  ошибка исчезала до того, как пользователь успевал её увидеть, хотя `mapServerErrors` отработал
  верно. Найдено живой проверкой в браузере (`form-develop-app` → `server-errors-demo`), не
  unit-тестами — мок формы в спеке (`setFieldMeta: vi.fn()`) не воспроизводит реальный
  пересчёт TanStack Form. Теперь пишет в `errorMap.onServer` — штатный ключ
  `ValidationErrorMap` именно для внешне применяемых (не-валидаторных) ошибок
  (`getErrorMapKey('server') === 'onServer'` в `@tanstack/form-core`), не занятый обычными
  циклами `onMount`/`onChange`/`onBlur`/`onSubmit`.
- Затрагивает ВСЕХ потребителей `applyServerErrors`, не только новый `useFormServerAction`
  (`@letar/forms-react` 0.9.0) — в том числе `apps/domwellbes` (`material-form.tsx`,
  `sign-in`/`sign-up`/`forgot-password`/`reset-password`) и `apps/dsperevod` (те же 4 auth-страницы),
  которые вызывали `applyServerErrors` напрямую и несли тот же латентный баг.
