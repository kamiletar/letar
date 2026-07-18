# Стиль кода

Этот документ описывает стандарты кодирования для всех проектов в монорепозитории.

## dprint настройки (форматирование)

- **Кавычки:** Одинарные (`'`) вместо двойных
- **Точки с запятой:** БЕЗ точек с запятой в конце строк
- **Отступ:** 2 пробела (не табы)
- **Макс. длина строки:** 120 символов
- **Trailing comma:** только в ES5 (массивы, объекты)
- **Скобки в стрелочных функциях:** всегда `(x) =>` не `x =>`
- **Конец строки:** LF (Unix-style)

## ESLint правила

- **`@typescript-eslint/consistent-type-imports`**: использовать `import type` для типов
- **`@typescript-eslint/no-unused-vars`**: неиспользуемые переменные с `_` в начале игнорируются
- **`no-console`**: разрешены только `console.warn` и `console.error`
- **`curly`**: всегда использовать фигурные скобки в if/else/for/while
- **`eqeqeq`**: всегда `===` вместо `==` (кроме сравнения с null)
- **`prefer-const`**: использовать const где возможно
- **`no-var`**: не использовать var

## Язык комментариев

- Все комментарии в коде пишутся на **русском языке**

## Пример правильного кода

```typescript
import type { User } from '@/types'
import { useState } from 'react'

const MyComponent = ({ user }: { user: User }) => {
  const [count, setCount] = useState(0)

  if (count > 0) {
    console.error('Count is positive')
  }

  return <div>{user.name}</div>
}
```

## Автоформатирование

Для автоматического форматирования используй команду:

```bash
nx format <app-name>
```

## Проверка стиля

Линтинг и проверка типов:

```bash
# Линтинг
nx lint <app-name>

# Проверка типов (используй tsgo - быстрее!)
nx typecheck:tsgo <app-name>
```

⚠️ **`typecheck:tsgo` не эквивалентен полному `tsc`**, который реально гоняет `next build` (прод-сборка
на сервере при деплое). Расхождение подтверждено на практике (2026-07-18, driving-school): `tsgo` не
поймал ошибку в exhaustive `Record<AuditAction, string>` (не все значения enum покрыты) и в
ZenStack-типизации `payload` Json-поля — обе ошибки прошли `typecheck:tsgo` зелёным, но уронили
`next build` при деплое (даунтайма не было — деплой упал до сборки Docker-образа, но потратил цикл
BlackCove). **Перед деплой-запросом**, если менялся код рядом с exhaustive union-типами
(`Record<SomeEnum, X>`) или Json-полями ZenStack-моделей — дополнительно прогони полный `nx typecheck
<app-name>` (без `:tsgo`), не полагайся только на `tsgo`.

## Обработка варнингов

Если варнинг линта нельзя исправить - подави его комментарием:

```typescript
// eslint-disable-next-line <rule-name>
const problematicCode = ...
```

⚠️ **ВАЖНО:** Подавляй варнинги только когда это действительно необходимо, чтобы не засорять вывод линта.
