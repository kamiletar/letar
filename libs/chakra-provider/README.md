# @letar/chakra-provider

Провайдеры и утилиты для интеграции Chakra UI v3 с Next.js App Router.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import {
  ColorModeButton,
  ColorModeProvider,
  ColorModeSelect,
  RootChakraProvider,
  useColorMode,
} from '@letar/chakra-provider'
```

## API

### Провайдеры

#### `RootChakraProvider`

Обёртка над `ChakraProvider` с поддержкой кастомной темы.

```tsx
// app/layout.tsx
import { RootChakraProvider } from '@letar/chakra-provider'
import { system } from './theme'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <RootChakraProvider value={system}>{children}</RootChakraProvider>
      </body>
    </html>
  )
}
```

**Props:**

| Prop       | Тип         | Описание                                                |
| ---------- | ----------- | ------------------------------------------------------- |
| `children` | `ReactNode` | Контент приложения                                      |
| `value`    | `System`    | Кастомная тема Chakra UI (по умолчанию `defaultSystem`) |

#### `ColorModeProvider`

Обёртка над `next-themes` для управления цветовыми режимами.

```tsx
// app/layout.tsx
import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <RootChakraProvider>
          <ColorModeProvider>{children}</ColorModeProvider>
        </RootChakraProvider>
      </body>
    </html>
  )
}
```

**Props:** Наследует все props от `ThemeProviderProps` (next-themes).

### Хуки

#### `useColorMode()`

Хук для управления цветовым режимом приложения.

```tsx
'use client'

import { useColorMode } from '@letar/chakra-provider'

function ThemeToggle() {
  const { colorMode, resolvedColorMode, setColorMode, toggleColorMode } = useColorMode()

  return (
    <div>
      <p>Текущий режим: {colorMode}</p>
      <p>Отображается: {resolvedColorMode}</p>
      <button onClick={toggleColorMode}>Переключить</button>
      <button onClick={() => setColorMode('system')}>Системная тема</button>
    </div>
  )
}
```

**Возвращаемые значения:**

| Поле                | Тип                              | Описание                       |
| ------------------- | -------------------------------- | ------------------------------ |
| `colorMode`         | `'light' \| 'dark' \| 'system'`  | Выбранный режим                |
| `resolvedColorMode` | `'light' \| 'dark' \| undefined` | Реальный отображаемый режим    |
| `setColorMode`      | `(mode) => void`                 | Установить режим               |
| `toggleColorMode`   | `() => void`                     | Переключить между light и dark |

#### `useColorModeValue(light, dark)`

Выбирает значение в зависимости от текущей цветовой темы. До монтирования и на сервере
возвращает `light`.

```tsx
'use client'

import { useColorModeValue } from '@letar/chakra-provider'

function Card() {
  const bg = useColorModeValue('white', 'gray.800')
  return <div style={{ background: bg }}>...</div>
}
```

### Компоненты

#### `ColorModeButton`

Кнопка переключения между светлой и тёмной темой.

```tsx
import { ColorModeButton } from '@letar/chakra-provider'

function Header() {
  return (
    <header>
      <ColorModeButton />
    </header>
  )
}
```

Показывает иконку солнца (☀️) в тёмной теме и луны (🌙) в светлой.

#### `ColorModeSelect`

Сегментный переключатель с тремя режимами: светлая, системная, тёмная.

```tsx
import { ColorModeSelect } from '@letar/chakra-provider'

function Settings() {
  return (
    <div>
      <label>Тема оформления:</label>
      <ColorModeSelect />
      {/* или только иконки */}
      <ColorModeSelect iconOnly />
    </div>
  )
}
```

**Props:**

| Prop       | Тип       | Описание                                  |
| ---------- | --------- | ----------------------------------------- |
| `iconOnly` | `boolean` | Показывать только иконки (default: false) |

## Зависимости

- `@chakra-ui/react` ^3.0.0
- `next-themes` ^0.4.0
- `react-icons` (lucide icons)

---

**Последнее обновление:** 2026-01-03
