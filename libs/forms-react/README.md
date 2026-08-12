# @letar/forms-react

Композиционный слой форм между framework-free ядром [`@letar/forms-core`](../forms-core/README.md)
и UI-скинами ([`@letar/forms`](../forms/README.md) на Chakra, будущий `@letar/forms-shadcn`).

Знает React и TanStack Form. **Не знает ни одной UI-библиотеки** — всё, что рисует, приходит
снаружи реализацией UIKit-контракта.

## Зачем отдельный пакет

Фаза 7.1 вынесла в `forms-core` логику, не зависящую ни от какого фреймворка, и зафиксировала
UIKit-контракт для **контрола** поля (`Input`, `Checkbox`, `Select`). Но **сборка** поля —
`createField`, обёртка `FieldWrapper`, error boundary, контекст формы, разрешение пропсов из
Zod-меты — оставалась в Chakra-скине и импортировала Chakra напрямую.

Из-за этого второй скин был вынужден дублировать весь композиционный слой целиком: два
расходящихся источника истины для одной и той же логики. Разбор — Фаза 7.3 в
[`libs/forms/PLAN.md`](../forms/PLAN.md).

Положить этот слой в `forms-core` было нельзя: правило «ядро не импортирует ни один фреймворк»
(решение 2026-07-08) держится двумя независимыми механизмами линта и не ослабляется. Отсюда
третий пакет — React есть, UI-библиотеки нет.

```
@letar/forms-core     ← ноль фреймворков (Zod-мета, валидаторы, i18n-словари, UIKit-контракт)
        ↑
@letar/forms-react    ← React + TanStack Form, ноль UI-библиотек  ← этот пакет
        ↑
@letar/forms          ← Chakra-скин: chakraUIKit + 56 полей
@letar/forms-shadcn    ← shadcn-скин: shadcnUIKit + те же примитивы сборки
```

## Как это работает

Скин один раз связывает композиционный слой со своей реализацией контракта:

```tsx
// libs/forms/src/lib/declarative/form-fields/base/primitives.ts
import { createFieldPrimitives } from '@letar/forms-react'
import { chakraUIKit } from './uikit-chakra'

export const { createField, FieldErrorBoundary, FieldWrapper } = createFieldPrimitives(chakraUIKit)
```

Дальше поля пишутся как раньше — они не знают, что примитивы кем-то параметризованы:

```tsx
export const FieldString = createField<StringFieldProps, string>({
  displayName: 'FieldString',
  render: ({ field, resolved, hasError, errorMessage, fullPath }) => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <Input
        value={field.state.value ?? ''}
        onChange={(e) =>
          field.handleChange(e.target.value)}
      />
    </FieldWrapper>
  ),
})
```

⚠️ Вызывать `createFieldPrimitives` **на уровне модуля**, а не внутри рендера: возвращаемые
компоненты должны быть стабильны по ссылке, иначе React размонтирует поддерево поля на каждой
перерисовке формы.

`FieldPrimitivesUIKit` — намеренно не весь `UIKit`, а `FieldRoot`/`FieldLabel`/`FieldError`/
`ErrorFallback`. Скину не нужно реализовать все ~20 примитивов, чтобы получить работающую
сборку поля; остальное он подключает по мере миграции своих полей.

## Что внутри

| Область     | Содержимое                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Контекст    | `DeclarativeFormContext`, `useDeclarativeForm(Optional)`, `FormGroup`/`useFormGroup`                                       |
| Сборка поля | `createFieldPrimitives` → `createField`, `FieldWrapper`, `FieldErrorBoundary`                                              |
| Хуки поля   | `useResolvedFieldProps`, `useDeclarativeField`, `useAsyncFieldValidation`, `useAsyncSearch`, `useDebounce`, `useMaskField` |
| Утилиты     | `formatFieldErrors`, `hasFieldErrors`, `getFieldErrors`, `resolveAutoComplete`                                             |
| i18n        | `FormI18nProvider`, `useFormI18n`, `useLocalizedOptions`, `getLocalizedValue`                                              |
| Типы        | `BaseFieldProps`, `DeclarativeFormContextValue`, `ResolvedFieldProps`, `AppFormApi`                                        |

`BaseFieldProps` живёт здесь, а не в скине, именно потому, что в нём нет ни одного пропа про
оформление. `size`, `variant`, `colorPalette` — словарь конкретной библиотеки, они остаются в
`*FieldProps` скина, который расширяет этот интерфейс.

## Граница

Проверяется двумя независимыми механизмами, оба подтверждены негативной пробой (временный
запрещённый импорт валит `nx lint forms-react`):

- `depConstraints` для тега `type:core-react` в корневом `eslint.config.mjs` — не зависеть от
  библиотек с тегом `type:ui`;
- `no-restricted-imports` на `**/forms-react/src/**` — против `@chakra-ui/*`, `@ark-ui/*`,
  `@radix-ui/*`, иконочных пакетов и против самих скинов (`@letar/forms`, `@letar/forms-shadcn`).

`allowTypeImports` намеренно не ставится: тип из UI-библиотеки в сигнатуре — та же протечка
границы, просто отложенная до момента, когда её кто-то попробует реализовать на другом скине.

## Mask-движок — React-биндинг (Фаза 8, Этап 3)

`useMaskField` — единственный хук здесь, который пишет напрямую в DOM (в `formatMode: 'live'`
через `MaskController` из `@letar/forms-core/mask`, неконтролируемый `<input>`). Подробности
API, три режима форматирования и почему `'live'` не может быть управляемым React — в
[`@letar/forms-core/README.md`](../forms-core/README.md#react-биндинг-этап-3-letarforms-react).
Chakra-потребитель — `Form.Field.MaskedInput` в `@letar/forms`.

## Команды

```bash
nx test forms-react
nx lint forms-react
nx typecheck:tsgo forms-react
```

## Подключение

`forms-react` — внутренняя зависимость скинов, приложения не импортируют его напрямую. Но
`paths` на него в `apps/<app>/tsconfig.json` нужны: потребитель компилирует **исходники**
`@letar/forms`, а в них есть импорты `@letar/forms-react`. Механика и подводные камни —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению),
[lib-entry-points.md](/.claude/docs/lib-entry-points.md).

## Связанные документы

- [/libs/forms-core/README.md](../forms-core/README.md) — ядро без фреймворков
- [/libs/forms/README.md](../forms/README.md) — Chakra-скин
- [/libs/forms/PLAN.md](../forms/PLAN.md) — Фаза 7 (расслоение, стратегия дистрибуции)
