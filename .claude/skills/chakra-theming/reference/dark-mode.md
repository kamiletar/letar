# Dark Mode

Chakra UI v3 использует **next-themes** для управления темой в Next.js.

## Настройка

### 1. ThemeProvider (next-themes)

```tsx
// app/providers.tsx
'use client'

import { system } from '@/theme'
import { ChakraProvider } from '@chakra-ui/react'
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class" // Добавляет class="dark" на html
      defaultTheme="system" // Следует системной теме
      enableSystem // Отслеживает prefers-color-scheme
      disableTransitionOnChange // Без мигания при смене темы
    >
      <ChakraProvider value={system}>{children}</ChakraProvider>
    </ThemeProvider>
  )
}
```

### 2. Layout

```tsx
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

> `suppressHydrationWarning` нужен т.к. тема определяется на клиенте

---

## useColorMode хук

```tsx
'use client'

import { useColorMode } from '@chakra-ui/react'
// или из проекта Letar:
// import { useColorMode } from '@letar/chakra-provider'

function ThemeToggle() {
  const { colorMode, setColorMode, toggleColorMode } = useColorMode()

  return <Button onClick={toggleColorMode}>{colorMode === 'dark' ? '🌙' : '☀️'}</Button>
}
```

### API useColorMode

```typescript
interface UseColorModeReturn {
  colorMode: 'light' | 'dark'
  setColorMode: (mode: 'light' | 'dark' | 'system') => void
  toggleColorMode: () => void
}
```

---

## ColorModeButton компонент

```tsx
import { ColorModeButton } from '@/components/ui/color-mode' // Готовый компонент с иконками
;<ColorModeButton />
```

Пример реализации:

```tsx
'use client'

import { IconButton } from '@chakra-ui/react'
import { useColorMode } from '@chakra-ui/react'
import { LuMoon, LuSun } from 'react-icons/lu'

export function ColorModeButton() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <IconButton aria-label="Toggle color mode" variant="ghost" size="sm" onClick={toggleColorMode}>
      {colorMode === 'dark' ? <LuSun /> : <LuMoon />}
    </IconButton>
  )
}
```

---

## Способы стилизации для dark mode

### 1. Семантические токены (рекомендуется)

```typescript
semanticTokens: {
  colors: {
    bg: {
      DEFAULT: {
        value: { _light: 'white', _dark: '{colors.gray.950}' },
      },
    },
    fg: {
      DEFAULT: {
        value: { _light: '{colors.gray.900}', _dark: 'white' },
      },
    },
  },
}
```

```tsx
// Автоматически меняется при смене темы
<Box bg="bg" color="fg" />
```

### 2. Условие \_dark

```tsx
<Box
  bg="white"
  _dark={{ bg: 'gray.800' }}
>
  Контент
</Box>

<Text
  color="gray.900"
  _dark={{ color: 'gray.100' }}
>
  Текст
</Text>
```

### 3. colorPalette

```tsx
// colorPalette автоматически адаптируется
<Button colorPalette="blue" variant="solid">
  Синяя кнопка
</Button>
```

---

## Принудительная тема

### Для всего приложения

```tsx
<ThemeProvider
  attribute="class"
  forcedTheme="dark" // Всегда dark
>
  ...
</ThemeProvider>
```

### Для части страницы

```tsx
<Box className="dark" data-theme="dark">
  {/* Всё внутри будет в dark mode */}
  <Card bg="bg.panel">...</Card>
</Box>
```

---

## Storage

По умолчанию next-themes сохраняет тему в localStorage.

```tsx
<ThemeProvider
  attribute="class"
  storageKey="chakra-color-mode" // Ключ в localStorage
  defaultTheme="system"
>
  ...
</ThemeProvider>
```

---

## SSR и гидратация

### Проблема

При SSR сервер не знает предпочтения пользователя → возможен "flash".

### Решение

```tsx
// app/layout.tsx
<html suppressHydrationWarning>
  <head>{/* Inline скрипт от next-themes предотвращает flash */}</head>
  <body>
    <Providers>{children}</Providers>
  </body>
</html>
```

### ColorModeScript (альтернатива)

```tsx
import { ColorModeScript } from '@chakra-ui/react'
;<html>
  <head>
    <ColorModeScript initialColorMode="system" />
  </head>
  ...
</html>
```

---

## Пример из проекта Letar

```tsx
// libs/chakra-provider/src/lib/use-color-mode.ts
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function useColorMode() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Предотвращает hydration mismatch
  const colorMode = mounted ? (resolvedTheme as 'light' | 'dark') : 'light'

  return {
    colorMode,
    setColorMode: setTheme,
    toggleColorMode: () => setTheme(colorMode === 'dark' ? 'light' : 'dark'),
  }
}
```

---

## Проверка темы системы

```typescript
// Проверка prefers-color-scheme
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

// Отслеживание изменений
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  console.log('System theme changed:', e.matches ? 'dark' : 'light')
})
```

## См. также

- [semantic-tokens.md](semantic-tokens.md) — Токены с \_light/\_dark
- [contrast-accessibility.md](contrast-accessibility.md) — Контраст и доступность
- [overview.md](overview.md) — Обзор системы темизации
