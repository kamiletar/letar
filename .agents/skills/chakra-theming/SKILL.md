---
name: chakra-theming
description: |
  Темизация Chakra UI v3: createSystem, токены и semantic tokens, recipes и slot recipes, dark/light mode. Загружай ДО правки theme.ts, defineRecipe/defineSlotRecipe и когда textStyle перебивает соседний fontSize, слоты slotRecipes пропали после partial-override, typecheck сыплет TS2322 на layerStyles, SSR падает на «extendWith is not a function», hydration mismatch из-за разных классов emotion.
---

# Chakra UI Theming Skill

## ⚠️ Ловушки (разборы в доках)

- [chakra-recipe-variant-property-override](/.claude/docs/chakra-recipe-variant-property-override.md) — `textStyle` перебивает соседний `fontSize`, `_hover` варианта мимо `base._hover`
- [chakra-slot-recipe-array-merge-truncation](/.claude/docs/chakra-slot-recipe-array-merge-truncation.md) — `slots` мержатся по индексу: короткий массив вычёркивает `root`
- [chakra-layer-style-property-allowlist](/.claude/docs/chakra-layer-style-property-allowlist.md) — TS2322 на `touchAction`/`transitionDuration` в layerStyle
- [chakra-multi-system-ssr-barrel-trap](/.claude/docs/chakra-multi-system-ssr-barrel-trap.md) — импорт из барреля с `createSystem()` в Server Component роняет SSR
- [chakra-css-memo-prop-order-hydration](/.claude/docs/chakra-css-memo-prop-order-hydration.md) — разные классы emotion на сервере и клиенте
- [chakra-strict-tokens-global-typegen](/.claude/docs/chakra-strict-tokens-global-typegen.md) — `strictTokens` ломает typecheck всех приложений

## Quick Reference

### Создание темы

```typescript
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const customConfig = defineConfig({
  theme: {
    tokens: {/* ... */},
    semanticTokens: {/* ... */},
    recipes: {/* ... */},
    slotRecipes: {/* ... */},
  },
})

export const system = createSystem(defaultConfig, customConfig)
```

### Основные семантические токены

```typescript
semanticTokens: {
  colors: {
    bg: {
      DEFAULT: { value: { _light: 'white', _dark: '{colors.gray.950}' } },
      subtle: { value: { _light: '{colors.gray.50}', _dark: '{colors.gray.900}' } },
      muted: { value: { _light: '{colors.gray.100}', _dark: '{colors.gray.800}' } },
    },
    fg: {
      DEFAULT: { value: { _light: '{colors.gray.900}', _dark: 'white' } },
      muted: { value: { _light: '{colors.gray.600}', _dark: '{colors.gray.400}' } },
    },
    border: {
      DEFAULT: { value: { _light: '{colors.gray.200}', _dark: '{colors.gray.800}' } },
    },
  },
}
```

### ColorModeProvider (Next.js)

```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes'
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <ChakraProvider value={system}>{children}</ChakraProvider>
</ThemeProvider>
```

### Визуальная обратная связь (\_active)

Эталон: `apps/driving-school/src/theme/` — полная система `_active` стилей для всех компонентов.

```typescript
// Recipes (defineRecipe)
button:     { _active: { transform: 'scale(0.95)' } }  // + size variants: xs=0.9, lg=0.97
link:       { _active: { transform: 'scale(0.9)' } }
iconButton: { _active: { transform: 'scale(0.85)' } }  // + size variants

// Slot Recipes (defineSlotRecipe)
tabs:         { trigger:      { _active: { transform: 'scale(0.95)' } } }
accordion:    { itemTrigger:  { _active: { bg: 'bg.subtle', transform: 'scale(0.99)' } } }
menu:         { item:         { _active: { bg: 'bg.muted', transform: 'scale(0.98)' } } }
segmentGroup: { item:         { _active: { transform: 'scale(0.98)' } } }
checkbox:     { control:      { _active: { transform: 'scale(0.9)' } } }
radio:        { control:      { _active: { transform: 'scale(0.9)' } } }
slider:       { thumb:        { _active: { transform: 'scale(1.1)' } } }  // Увеличение!
tag:          { closeTrigger: { _active: { transform: 'scale(0.85)' } } }

// Layer Styles
'card.interactive': { _active: { transform: 'scale(0.99)' } }
'card.selectable':  { _active: { transform: 'scale(0.98)' } }
```

**Правила:**

- `transition: 'all 0.15s ease-out'` — обязателен (без него резкий эффект)
- `_disabled: { _active: { transform: 'none' } }` — отключай для disabled
- Slider thumb — единственный элемент с **увеличением** (1.1)

Подробнее: [visual-feedback.md](reference/visual-feedback.md)

## Справочные файлы

| Файл                                                             | Описание                               |
| ---------------------------------------------------------------- | -------------------------------------- |
| [overview.md](reference/overview.md)                             | Архитектура темизации                  |
| [tokens.md](reference/tokens.md)                                 | Design tokens (colors, spacing, sizes) |
| [semantic-tokens.md](reference/semantic-tokens.md)               | Семантические токены, \_light/\_dark   |
| [recipes.md](reference/recipes.md)                               | Recipes для компонентов                |
| [slot-recipes.md](reference/slot-recipes.md)                     | Slot Recipes                           |
| [dark-mode.md](reference/dark-mode.md)                           | Dark/Light mode                        |
| [contrast-accessibility.md](reference/contrast-accessibility.md) | WCAG контраст                          |
| [haptic-feedback.md](reference/haptic-feedback.md)               | Тактильная обратная связь              |
| [visual-feedback.md](reference/visual-feedback.md)               | Визуальная обратная связь              |
| [text-layer-styles.md](reference/text-layer-styles.md)           | Text и Layer Styles                    |
| [animations.md](reference/animations.md)                         | Анимации и переходы                    |
| [customization.md](reference/customization.md)                   | Conditions, CSS vars, utilities        |

## Генерация типов

```bash
npx @chakra-ui/cli typegen ./src/theme/index.ts
```

## Примеры тем в проекте Letar

- `apps/driving-school/src/theme/` — полная система визуальной обратной связи
- `apps/mandala/src/app/theme.ts` — семантические токены
