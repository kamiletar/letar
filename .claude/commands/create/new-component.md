# New Component - Создание компонента

Создай новый React компонент с Chakra UI v3.

## Когда использовать

- Новый UI элемент
- Переиспользуемый компонент
- Обёртка над Chakra компонентом

## Где размещать

| Тип          | Расположение                |
| ------------ | --------------------------- |
| App-specific | `apps/<app>/_components/`   |
| Shared UI    | `libs/ui/src/`              |
| Form field   | `libs/forms/src/` |

## Шаги

### 1. Создать файл компонента

```tsx
// components/my-component.tsx
'use client'

import { Box, type BoxProps } from '@chakra-ui/react'

interface MyComponentProps extends BoxProps {
  /** Заголовок компонента */
  title: string
  /** Вариант отображения */
  variant?: 'solid' | 'outline'
}

/**
 * Описание компонента
 */
export function MyComponent({ title, variant = 'solid', ...props }: MyComponentProps) {
  return (
    <Box
      bg={variant === 'solid' ? 'blue.500' : 'transparent'}
      borderWidth={variant === 'outline' ? '1px' : 0}
      {...props}
    >
      {title}
    </Box>
  )
}
```

### 2. Экспортировать (для shared)

```typescript
// libs/ui/src/index.ts
export { MyComponent } from './lib/my-component'
```

### 3. Использование

```tsx
import { MyComponent } from '@letar/ui'
// или
import { MyComponent } from '@/app/_components/my-component'
;<MyComponent title="Hello" variant="outline" />
```

## Паттерны Chakra UI v3

### Slot-based компоненты

```tsx
import { Box, Text } from '@chakra-ui/react'

interface CardProps {
  title: string
  children: React.ReactNode
}

export function Card({ title, children }: CardProps) {
  return (
    <Box borderRadius="lg" shadow="md" p={4}>
      <Text fontWeight="bold" mb={2}>
        {title}
      </Text>
      {children}
    </Box>
  )
}
```

### Compound компоненты

```tsx
function CardRoot({ children }: { children: React.ReactNode }) {
  return (
    <Box borderRadius="lg" shadow="md">
      {children}
    </Box>
  )
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <Box p={4} borderBottomWidth="1px">
      {children}
    </Box>
  )
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <Box p={4}>{children}</Box>
}

export const Card = {
  Root: CardRoot,
  Header: CardHeader,
  Body: CardBody,
}
```

### forwardRef

```tsx
import { Box, type BoxProps } from '@chakra-ui/react'
import { forwardRef } from 'react'

export const MyComponent = forwardRef<HTMLDivElement, BoxProps>(function MyComponent(props, ref) {
  return <Box ref={ref} {...props} />
})
```

## Чеклист

- [ ] TypeScript типы для props
- [ ] JSDoc комментарии (на русском)
- [ ] Поддержка Chakra props (spread)
- [ ] Responsive дизайн
- [ ] Accessibility (aria-\*)
- [ ] Экспорт добавлен

## Документация

- [ui-components.md](/.claude/docs/ui-components.md) — паттерны UI
- `chakra-ui` MCP — для документации Chakra
