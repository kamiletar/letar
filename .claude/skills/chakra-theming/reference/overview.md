# Обзор системы темизации Chakra UI v3

## Архитектура

Chakra UI v3 использует **Panda CSS** под капотом. Система темизации состоит из:

```
createSystem(defaultConfig, customConfig)
       ↓
   ChakraProvider
       ↓
   Компоненты
```

## Создание системы

### defaultConfig vs defaultBaseConfig

| Конфиг              | Описание                                                     |
| ------------------- | ------------------------------------------------------------ |
| `defaultConfig`     | Полная конфигурация с preset'ами компонентов                 |
| `defaultBaseConfig` | Базовая конфигурация без preset'ов (для полной кастомизации) |

### defineConfig + createSystem

```typescript
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

// Кастомная конфигурация
const customConfig = defineConfig({
  // Настройки CSS переменных
  cssVarsRoot: ':where(html)',
  cssVarsPrefix: 'chakra',

  // Глобальные CSS стили
  globalCss: {
    html: { fontFamily: 'Inter, sans-serif' },
    '*::selection': { bg: 'blue.200' },
  },

  // Тема
  theme: {
    // Design токены
    tokens: {
      colors: {/* ... */},
      spacing: {/* ... */},
      fonts: {/* ... */},
    },

    // Семантические токены (с условиями _light/_dark)
    semanticTokens: {
      colors: {
        bg: { value: { _light: 'white', _dark: '{colors.gray.950}' } },
      },
    },

    // Рецепты компонентов
    recipes: {
      button: defineRecipe({/* ... */}),
    },

    // Slot рецепты
    slotRecipes: {
      card: defineSlotRecipe({/* ... */}),
    },

    // Text и Layer стили
    textStyles: {/* ... */},
    layerStyles: {/* ... */},

    // Keyframes анимации
    keyframes: {/* ... */},
  },

  // Кастомные conditions
  conditions: {
    off: '&:is([data-state=off])',
    on: '&:is([data-state=on])',
  },
})

// Создание системы (мерж с defaultConfig)
export const system = createSystem(defaultConfig, customConfig)
```

## ChakraProvider

```tsx
// app/providers.tsx
'use client'

import { system } from '@/theme'
import { ChakraProvider } from '@chakra-ui/react'
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ChakraProvider value={system}>{children}</ChakraProvider>
    </ThemeProvider>
  )
}
```

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

## Генерация типов

Для TypeScript автокомплита токенов:

```bash
npx @chakra-ui/cli typegen ./src/theme/index.ts
```

Создаётся файл `styled-system/` с типами для:

- Токенов (`colors.gray.500`)
- Семантических токенов (`bg.subtle`)
- Text/Layer стилей
- Условий

## Структура темы в проекте Letar

```
apps/driving-school/src/theme/
├── index.ts              # createSystem, defineConfig
├── tokens/
│   ├── colors.ts         # Цветовые токены
│   └── index.ts          # Экспорт всех токенов
├── semanticTokens/
│   ├── colors.ts         # bg, fg, border
│   └── index.ts
├── recipes/
│   ├── button.ts         # defineRecipe
│   ├── link.ts
│   └── index.ts
├── slotRecipes/
│   ├── menu.ts           # defineSlotRecipe
│   └── index.ts
└── styles/
    ├── layerStyles.ts
    ├── textStyles.ts
    └── index.ts
```

## Порядок применения стилей

1. **Base styles** (из recipe)
2. **Variant styles** (size, variant)
3. **Compound variants**
4. **Inline props** (`<Button bg="red.500">`)
5. **CSS** (className, sx)

## См. также

- [tokens.md](tokens.md) — Design токены
- [semantic-tokens.md](semantic-tokens.md) — Семантические токены
- [recipes.md](recipes.md) — Рецепты компонентов
- [dark-mode.md](dark-mode.md) — Dark/Light mode
