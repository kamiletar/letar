# @letar/forms-shadcn

shadcn/ui-скин `@letar/forms` — beta, реализация `UIKit`-контракта из `@letar/forms-core` на
прямых Radix-примитивах + `cva`/`tailwind-merge` (не `shadcn` CLI — обоснование в
[libs/forms/PLAN.md](../forms/PLAN.md), Фаза 7.3, Шаг 5).

Композиционный слой (`createField`, `FieldWrapper`, `FieldErrorBoundary`) не отличается от
Chakra-скина — оба используют `createFieldPrimitives` из `@letar/forms-react`, каждый со своей
реализацией `UIKit`. Ни `forms-core`, ни `forms-react` не потребовалось менять при подключении
второй реализации — это и есть проверка архитектуры Фазы 7.1/7.3.

## Требования потребителя

Tailwind 4 в приложении (сканирование контента через `@source`) — скин не самодостаточен без
него. Для приложений монорепо (все на Chakra) это не актуально: пакет предназначен для внешней
OSS-аудитории.

## Установка

Библиотека уже включена в монорепозиторий.

```tsx
import { FieldCheckbox, FieldSelect, FieldString } from '@letar/forms-shadcn'
```

## Поля (beta — 3 из 15–20 запланированных)

| Поле            | Radix-примитив             |
| --------------- | -------------------------- |
| `FieldString`   | нативный `<input>`         |
| `FieldCheckbox` | `@radix-ui/react-checkbox` |
| `FieldSelect`   | `@radix-ui/react-select`   |

Остальные ходовые поля (Textarea/Number/RadioGroup/Date и т.д.) — по мере миграции, каждое
почти бесплатно благодаря готовому `UIKit`-контракту.

## `shadcnUIKit`

Реализует `UIKitCorePrimitives` (`FieldRoot`/`FieldLabel`/`FieldError`/`Input`/`Checkbox`/`Select`)

- `ErrorFallback` из extended-набора — минимум, нужный `createFieldPrimitives`. Остальные
  extended-примитивы (`Button`, `Tooltip` и т.д.) появятся по мере миграции полей, которым они
  нужны.

## Известные упрощения beta

- Tooltip у `FieldLabel` — нативный `title`, не полноценный Radix Tooltip с попапом (пакет уже
  установлен, доведём при миграции полей, где это важнее).
- Нет группировки опций в `Select` (`groupOptions` из `forms-core/uikit` не подключена) — не
  нужна для 2 демо-опций, подключим вместе с полем, которому это действительно требуется.

## Команды

```bash
nx test forms-shadcn
nx lint forms-shadcn
nx typecheck:tsgo forms-shadcn
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/forms-shadcn` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/forms-shadcn` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
