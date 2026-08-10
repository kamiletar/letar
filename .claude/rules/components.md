---
paths: apps/**/_components/**, libs/ui/**
---

> ⚠️ **`paths:`-правила Claude Code инжектит только при чтении подходящего файла и НЕ инжектит
> при `Write`** ([claude-code#23478](https://github.com/anthropics/claude-code/issues/23478)) —
> то есть ровно в момент создания нового компонента правило недоступно. Проверяемые пункты
> отсюда — кандидаты на semgrep-правило (`.semgrep/letar-rules.yml`), остальное работает как
> справочник при повторном чтении файла.

# Правила для UI компонентов

## Chakra UI v3

```tsx
'use client'

import { Box, type BoxProps, Text, VStack } from '@chakra-ui/react'

interface CardProps extends BoxProps {
  /** Заголовок карточки */
  title: string
}

/**
 * Карточка с заголовком
 */
export function Card({ title, children, ...props }: CardProps) {
  return (
    <Box borderRadius="lg" shadow="md" p={4} {...props}>
      <Text fontWeight="bold" mb={2}>
        {title}
      </Text>
      {children}
    </Box>
  )
}
```

## Compound Components

```tsx
function CardRoot({ children }: { children: React.ReactNode }) {
  return <Box borderRadius="lg" shadow="md">{children}</Box>
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <Box p={4} borderBottomWidth="1px">{children}</Box>
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <Box p={4}>{children}</Box>
}

export const Card = {
  Root: CardRoot,
  Header: CardHeader,
  Body: CardBody,
}

// Использование
<Card.Root>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card.Root>
```

## forwardRef

```tsx
import { forwardRef } from 'react'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  return <ChakraButton ref={ref} {...props} />
})
```

## ⛔ ЗАПРЕТ: проп `as=` в Chakra UI v3

Проп `as=""` и `as={Component}` **ПОЛНОСТЬЮ ЗАПРЕЩЁН**. Использовать ТОЛЬКО `asChild` + нативный HTML-элемент внутри.

```tsx
// ❌ ЗАПРЕЩЕНО — НЕ ПИСАТЬ НИКОГДА
<Box as="button" disabled onClick={handler}>Click</Box>
<Box as="a" href="/page">Link</Box>
<Box as={FaIcon} boxSize={4} />
<Text as="label" htmlFor="id">Label</Text>

// ✅ asChild + нативный элемент
<Box px={4} py={2} asChild>
  <button disabled onClick={handler}>Click</button>
</Box>

// ✅ Иконки — рендерить напрямую
<FaKeyboard size={16} />
```

### ⚠️ Антипаттерн: `<input>` вложен в `<label>` после замены `as="label"`

Частый паттерн — кастомная кнопка загрузки файла или чекбокса: `<label>` оборачивает скрытый
`<input>`, чтобы клик по видимому тексту открывал системный диалог/тогглил чекбокс. При наивной
замене `as="label"` → `asChild` + `<label>` вложенность **сохраняют**, и это ломает клик:
клик по `<input>` срабатывает напрямую, событие всплывает до `<label>`, `<label>` повторно
активирует тот же `<input>` — двойной toggle. Для чекбокса — состояние переключается дважды
(визуально ничего не меняется), для `<input type="file">` — риск повторного открытия
системного файлового диалога.

Наступали дважды: `apps/svoichuzhie/PLAN_COMPLETED.md` (запись 2026-06-13, «input/label без
вложения») и `apps/mandala/PLAN_COMPLETED.md` (v0.40.4, 2026-08-04).

```tsx
// ❌ АНТИПАТТЕРН — input вложен в label, двойной toggle клика
<Box asChild>
  <label>
    Текст
    <input type="checkbox" onChange={...} style={{ display: 'none' }} />
  </label>
</Box>

// ✅ label и input — СОСЕДИ через htmlFor/id, не вложены
const inputId = useId()
<Box asChild>
  <label htmlFor={inputId}>Текст</label>
</Box>
<input id={inputId} type="checkbox" onChange={...} style={{ display: 'none' }} />
```

## Правила

- `'use client'` для интерактивных компонентов
- Extend Chakra props (`...BoxProps`)
- JSDoc комментарии на русском
- TypeScript типы для всех props
- Spread props в конце (`{...props}`)
- `forwardRef` для компонентов с ref

## Где размещать

| Тип          | Расположение              |
| ------------ | ------------------------- |
| App-specific | `apps/<app>/_components/` |
| Shared UI    | `libs/ui/src/`            |
| Form fields  | `libs/forms/src/`         |

## Документация

→ **Skill: `chakra-theming`** — токены, dark mode, анимации
→ **Skill: `mobile-ui`** — responsive props, breakpoints
→ Используй `chakra-ui` MCP для актуальной документации компонентов
