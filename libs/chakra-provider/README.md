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
  useIosActiveFix,
} from '@letar/chakra-provider'

// Только Next.js App Router — отдельный подпуть
import { EmotionRegistry } from '@letar/chakra-provider/next'
```

## Точки входа

| Подпуть                       | Что внутри                                  | Кому                                  |
| ----------------------------- | ------------------------------------------- | ------------------------------------- |
| `@letar/chakra-provider`      | провайдеры, переключатели темы, хуки        | всем, включая Electron/Vite-рендереры |
| `@letar/chakra-provider/next` | `EmotionRegistry` (тянет `next/navigation`) | только Next.js App Router             |

Подпуть требует отдельной строки в `paths` каждого tsconfig-потребителя — см.
`.claude/docs/lib-entry-points.md`.

## API

### Провайдеры

#### `RootChakraProvider`

Обёртка над `ChakraProvider` с поддержкой кастомной темы. Заодно включает `:active` на iOS
(см. [`useIosActiveFix`](#useiosactivefix)) — приложению ничего подключать не нужно.

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

#### `EmotionRegistry` (`@letar/chakra-provider/next`)

Реестр кеша Emotion для App Router. **Обязателен** в корневом провайдере Next-приложения, снаружи
`ColorModeProvider`/`RootChakraProvider`:

```tsx
'use client'
import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { EmotionRegistry } from '@letar/chakra-provider/next'

export function Providers({ children }: PropsWithChildren) {
  return (
    <EmotionRegistry>
      <ColorModeProvider>
        <RootChakraProvider value={system}>{children}</RootChakraProvider>
      </ColorModeProvider>
    </EmotionRegistry>
  )
}
```

Без него Chakra на SSR рендерит инлайн-`<style data-emotion>` перед каждым элементом. Стиль
позднего потокового сегмента (`loading.tsx`, `<Suspense>`) остаётся в теле страницы, гидратация
находит `<style>` вместо элемента и плавающе падает с ошибкой React #418, пересобирая корень.
Реестр копит правила (`cache.compat = true`) и отдаёт их в поток через `useServerInsertedHTML`.
Разбор — `.claude/docs/emotion-streaming-inline-style-hydration-418.md`.

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

#### `useIosActiveFix()`

Включает `:active` (в Chakra — `_active`) на iOS. Safari не применяет `:active`, пока на документе
нет ни одного `touchstart`-листенера, поэтому хук вешает на `document` пустой пассивный. Листенер
снимается при размонтировании (в StrictMode dev эффект выполняется дважды — без снятия копились бы
дубли). На скролл не влияет (`passive: true`), на десктопе и в Electron ничего не меняет.

`RootChakraProvider` вызывает хук сам. Явный вызов нужен только приложению на голом `ChakraProvider`
из `@chakra-ui/react`:

```tsx
'use client'
import { ChakraProvider } from '@chakra-ui/react'
import { useIosActiveFix } from '@letar/chakra-provider'

export function Provider({ children }: PropsWithChildren) {
  useIosActiveFix()
  return <ChakraProvider value={system}>{children}</ChakraProvider>
}
```

⚠️ Не копируй фикс в приложение руками (`useEffect` + `addEventListener` без cleanup) — до
2026-09-24 такая копия жила в 10 корневых провайдерах.

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

**Последнее обновление:** 2026-09-24
