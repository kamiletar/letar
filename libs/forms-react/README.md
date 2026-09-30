# @letar/forms-react

Композиционный слой форм между framework-free ядром `@letar/forms-core`
и UI-скинами (`@letar/forms` на Chakra, `@letar/forms-shadcn`).

Знает React и TanStack Form. **Не знает ни одной UI-библиотеки** — всё, что рисует, приходит
снаружи реализацией UIKit-контракта.

## Установка

```bash
npm i @letar/forms-react@beta @tanstack/react-form react zod
```

Требуется peer `@letar/forms-core` (>=0.28.0 <1).

## Зачем отдельный пакет

В `forms-core` вынесена логика, не зависящую ни от какого фреймворка, и зафиксировала
UIKit-контракт для **контрола** поля (`Input`, `Checkbox`, `Select`). Но **сборка** поля —
`createField`, обёртка `FieldWrapper`, error boundary, контекст формы, разрешение пропсов из
Zod-меты — оставалась в Chakra-скине и импортировала Chakra напрямую.

Из-за этого второй скин был вынужден дублировать весь композиционный слой целиком: два
расходящихся источника истины для одной и той же логики.

Положить этот слой в `forms-core` было нельзя: правило «ядро не импортирует ни один фреймворк»
держится двумя независимыми механизмами линта и не ослабляется. Отсюда
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
// primitives.ts скина
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
| Хуки формы  | `useFormServerAction` — pending/toast/`mapServerErrors`+`applyServerErrors` в один вызов                                   |
| Утилиты     | `formatFieldErrors`, `hasFieldErrors`, `getFieldErrors`, `resolveAutoComplete`                                             |
| i18n        | `FormI18nProvider`, `useFormI18n`, `useLocalizedOptions`, `getLocalizedValue`                                              |
| Типы        | `BaseFieldProps`, `DeclarativeFormContextValue`, `ResolvedFieldProps`, `AppFormApi`                                        |

`BaseFieldProps` живёт здесь, а не в скине, именно потому, что в нём нет ни одного пропа про
оформление. `size`, `variant`, `colorPalette` — словарь конкретной библиотеки, они остаются в
`*FieldProps` скина, который расширяет этот интерфейс.

## Граница

Пакет намеренно не импортирует UI-библиотеки (`@chakra-ui/*`, `@ark-ui/*`, `@radix-ui/*`,
иконочные пакеты) и сами скины (`@letar/forms`, `@letar/forms-shadcn`). Тип из UI-библиотеки в
сигнатуре — та же протечка границы, просто отложенная до момента, когда её кто-то попробует
реализовать на другом скине.

## Mask-движок — React-биндинг

`useMaskField` — единственный хук здесь, который пишет напрямую в DOM (в `formatMode: 'live'`
через `MaskController` из `@letar/forms-core/mask`, неконтролируемый `<input>`). Подробности
API, три режима форматирования и почему `'live'` не может быть управляемым React — в README
`@letar/forms-core` (раздел «React-биндинг»).
Chakra-потребитель — `Form.Field.MaskedInput` в `@letar/forms`.

## Связанные пакеты

- `@letar/forms-core` — ядро без фреймворков
- `@letar/forms` — Chakra-скин
