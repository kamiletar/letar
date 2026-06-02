# Семантические токены

Семантические токены — абстракция над design токенами с поддержкой условий (dark/light mode).

## Синтаксис

```typescript
semanticTokens: {
  colors: {
    // Простой токен
    'bg.canvas': { value: '{colors.gray.50}' },

    // С условиями _light / _dark
    bg: {
      DEFAULT: {
        value: {
          _light: 'white',
          _dark: '{colors.gray.950}',
        },
      },
    },

    // Вложенные токены
    fg: {
      DEFAULT: { value: { _light: '{colors.gray.900}', _dark: 'white' } },
      muted: { value: { _light: '{colors.gray.600}', _dark: '{colors.gray.400}' } },
      subtle: { value: { _light: '{colors.gray.500}', _dark: '{colors.gray.500}' } },
    },
  },
}
```

## Ссылки на токены

```typescript
// Ссылка на design токен
{
  value: '{colors.gray.500}'
}

// Прямое значение
{
  value: '#3366FF'
}
{
  value: 'white'
}

// С opacity
{
  value: '{colors.blue.500}/50'
} // 50% opacity
```

---

## Категории семантических токенов

### Background (bg)

| Токен           | Описание          | Light    | Dark     |
| --------------- | ----------------- | -------- | -------- |
| `bg`            | Основной фон      | white    | gray.950 |
| `bg.subtle`     | Слегка выделенный | gray.50  | gray.900 |
| `bg.muted`      | Приглушённый      | gray.100 | gray.800 |
| `bg.emphasized` | Акцентированный   | gray.200 | gray.700 |
| `bg.inverted`   | Инвертированный   | gray.900 | white    |
| `bg.panel`      | Фон панелей       | white    | gray.900 |
| `bg.canvas`     | Фон страницы      | gray.50  | gray.950 |

```typescript
semanticTokens: {
  colors: {
    bg: {
      DEFAULT: { value: { _light: 'white', _dark: '{colors.gray.950}' } },
      subtle: { value: { _light: '{colors.gray.50}', _dark: '{colors.gray.900}' } },
      muted: { value: { _light: '{colors.gray.100}', _dark: '{colors.gray.800}' } },
      emphasized: { value: { _light: '{colors.gray.200}', _dark: '{colors.gray.700}' } },
      inverted: { value: { _light: '{colors.gray.900}', _dark: 'white' } },
      panel: { value: { _light: 'white', _dark: '{colors.gray.900}' } },
      canvas: { value: { _light: '{colors.gray.50}', _dark: '{colors.gray.950}' } },
    },
  },
}
```

### Foreground (fg)

| Токен         | Описание        | Light    | Dark     |
| ------------- | --------------- | -------- | -------- |
| `fg`          | Основной текст  | gray.900 | white    |
| `fg.muted`    | Второстепенный  | gray.600 | gray.400 |
| `fg.subtle`   | Приглушённый    | gray.500 | gray.500 |
| `fg.inverted` | Инвертированный | white    | gray.900 |

```typescript
fg: {
  DEFAULT: { value: { _light: '{colors.gray.900}', _dark: 'white' } },
  muted: { value: { _light: '{colors.gray.600}', _dark: '{colors.gray.400}' } },
  subtle: { value: { _light: '{colors.gray.500}', _dark: '{colors.gray.500}' } },
  inverted: { value: { _light: 'white', _dark: '{colors.gray.900}' } },
},
```

### Border

| Токен               | Описание        | Light    | Dark     |
| ------------------- | --------------- | -------- | -------- |
| `border`            | Основной бордер | gray.200 | gray.800 |
| `border.muted`      | Приглушённый    | gray.100 | gray.900 |
| `border.subtle`     | Слабый          | gray.50  | gray.950 |
| `border.emphasized` | Акцентированный | gray.300 | gray.700 |

```typescript
border: {
  DEFAULT: { value: { _light: '{colors.gray.200}', _dark: '{colors.gray.800}' } },
  muted: { value: { _light: '{colors.gray.100}', _dark: '{colors.gray.900}' } },
  subtle: { value: { _light: '{colors.gray.50}', _dark: '{colors.gray.950}' } },
  emphasized: { value: { _light: '{colors.gray.300}', _dark: '{colors.gray.700}' } },
},
```

### Status (error, warning, success, info)

```typescript
// Error
error: {
  DEFAULT: { value: { _light: '{colors.red.500}', _dark: '{colors.red.400}' } },
  subtle: { value: { _light: '{colors.red.50}', _dark: '{colors.red.950}' } },
  muted: { value: { _light: '{colors.red.100}', _dark: '{colors.red.900}' } },
  emphasized: { value: { _light: '{colors.red.200}', _dark: '{colors.red.800}' } },
  fg: { value: { _light: '{colors.red.700}', _dark: '{colors.red.300}' } },
},

// Warning
warning: {
  DEFAULT: { value: { _light: '{colors.orange.500}', _dark: '{colors.orange.400}' } },
  // ... аналогично error
},

// Success
success: {
  DEFAULT: { value: { _light: '{colors.green.500}', _dark: '{colors.green.400}' } },
  // ... аналогично error
},

// Info
info: {
  DEFAULT: { value: { _light: '{colors.blue.500}', _dark: '{colors.blue.400}' } },
  // ... аналогично error
},
```

---

## colorPalette

colorPalette — динамическая цветовая палитра для компонентов:

```typescript
// В recipe
button: defineRecipe({
  base: {
    colorPalette: 'gray', // Default palette
  },
  variants: {
    variant: {
      solid: {
        bg: 'colorPalette.500', // Использует текущую палитру
        color: 'colorPalette.fg',
        _hover: { bg: 'colorPalette.600' },
      },
    },
  },
})
```

```tsx
// Использование — меняет палитру
<Button colorPalette="blue">Blue</Button>
<Button colorPalette="red">Red</Button>
<Button colorPalette="green">Green</Button>
```

### Семантические токены для colorPalette

```typescript
semanticTokens: {
  colors: {
    colorPalette: {
      solid: { value: '{colors.colorPalette.600}' },
      'solid/hover': { value: '{colors.colorPalette.700}' },
      contrast: { value: 'white' },
      fg: { value: '{colors.colorPalette.700}' },
      muted: { value: '{colors.colorPalette.400}' },
      subtle: { value: '{colors.colorPalette.50}' },
      'subtle/hover': { value: '{colors.colorPalette.100}' },
      emphasized: { value: '{colors.colorPalette.100}' },
      focusRing: { value: '{colors.colorPalette.500}' },
    },
  },
}
```

---

## Пример из проекта Letar

```typescript
// apps/mandala/src/app/theme.ts
semanticTokens: {
  colors: {
    fg: {
      brand: { value: { _light: '#1A0F66', _dark: '#B3B0E0' } },
      solid: { value: '#201380' },
      muted: { value: { _light: '#7B7B99', _dark: '#8F8FB3' } },
    },
    bg: {
      canvas: { value: { _light: '#F5F5F5', _dark: '#111111' } },
      panel: { value: { _light: 'white', _dark: '#1A1A1A' } },
      muted: { value: { _light: '#F5F5F8', _dark: '#1C1C26' } },
      subtle: { value: { _light: '#FAFAFF', _dark: '#14141D' } },
      accent: {
        DEFAULT: { value: { _light: '#F0F0FF', _dark: '#1E1E35' } },
        muted: { value: { _light: '#E8E8F8', _dark: '#252540' } },
      },
    },
    border: {
      DEFAULT: { value: { _light: '#E0E0E8', _dark: '#2D2D3D' } },
      subtle: { value: { _light: '#F0F0F5', _dark: '#1F1F2E' } },
      emphasized: { value: { _light: '#C8C8D8', _dark: '#3D3D50' } },
    },
    // Brand colors
    purple: {
      DEFAULT: { value: '#6B5CE7' },
      muted: { value: '#8B7EF0' },
      subtle: { value: '#A99DF5' },
    },
  },
}
```

---

## Использование

```tsx
// В JSX
<Box bg="bg.subtle" color="fg.muted" borderColor="border" />
<Text color="error.fg">Ошибка</Text>
<Box bg="success.subtle" p={4}>Успех</Box>

// Прямое использование токенов
<Box bg="blue.500" />  // Design токен
<Box bg="bg.muted" />  // Семантический токен
```

## См. также

- [tokens.md](tokens.md) — Design токены
- [dark-mode.md](dark-mode.md) — Dark/Light mode
- [contrast-accessibility.md](contrast-accessibility.md) — Контраст и доступность
