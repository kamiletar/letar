# Контраст и доступность

Рекомендации по цветовому контрасту для соответствия WCAG.

## WCAG требования

### Уровни соответствия

| Уровень | Обычный текст | Крупный текст | UI компоненты |
| ------- | ------------- | ------------- | ------------- |
| **AA**  | 4.5:1         | 3:1           | 3:1           |
| **AAA** | 7:1           | 4.5:1         | —             |

> **Крупный текст:** 18pt (24px) или 14pt bold (19px)

### Примеры контраста

| Комбинация        | Контраст | AA                  | AAA |
| ----------------- | -------- | ------------------- | --- |
| Чёрный на белом   | 21:1     | ✅                  | ✅  |
| gray.900 на white | ~17:1    | ✅                  | ✅  |
| gray.700 на white | ~9:1     | ✅                  | ✅  |
| gray.600 на white | ~5.7:1   | ✅                  | ❌  |
| gray.500 на white | ~4.6:1   | ✅                  | ❌  |
| gray.400 на white | ~3:1     | ⚠️ (только крупный) | ❌  |

---

## prefers-contrast

CSS media query для пользователей, предпочитающих повышенный контраст:

```css
@media (prefers-contrast: more) {
  /* Высокий контраст */
}

@media (prefers-contrast: less) {
  /* Пониженный контраст */
}

@media (prefers-contrast: no-preference) {
  /* Без предпочтений */
}
```

### Кастомное условие в Chakra

```typescript
const config = defineConfig({
  conditions: {
    contrastMore: '@media (prefers-contrast: more)',
    contrastLess: '@media (prefers-contrast: less)',
  },
})
```

```tsx
<Box color="fg" _contrastMore={{ color: 'black', bg: 'white' }} />
```

---

## Семантические токены для контраста

### Базовый паттерн

```typescript
semanticTokens: {
  colors: {
    fg: {
      DEFAULT: {
        value: {
          base: '{colors.gray.900}',
          _dark: '{colors.gray.50}',
          _contrastMore: '{colors.black}',  // Чистый чёрный
        },
      },
      muted: {
        value: {
          base: '{colors.gray.600}',
          _dark: '{colors.gray.400}',
          _contrastMore: '{colors.gray.800}',  // Темнее для контраста
        },
      },
    },
    bg: {
      DEFAULT: {
        value: {
          base: 'white',
          _dark: '{colors.gray.950}',
          _contrastMore: 'white',
        },
      },
    },
    border: {
      DEFAULT: {
        value: {
          base: '{colors.gray.200}',
          _dark: '{colors.gray.800}',
          _contrastMore: '{colors.gray.900}',  // Тёмные границы
        },
      },
    },
  },
}
```

### High Contrast Theme

```typescript
const highContrastTokens = {
  colors: {
    // Максимальный контраст текста
    fg: {
      DEFAULT: { value: { _light: 'black', _dark: 'white' } },
      muted: { value: { _light: '{colors.gray.800}', _dark: '{colors.gray.200}' } },
    },

    // Чистые фоны
    bg: {
      DEFAULT: { value: { _light: 'white', _dark: 'black' } },
      subtle: { value: { _light: '{colors.gray.100}', _dark: '{colors.gray.900}' } },
    },

    // Контрастные границы
    border: {
      DEFAULT: { value: { _light: 'black', _dark: 'white' } },
    },

    // Яркие статусные цвета
    error: {
      DEFAULT: { value: { _light: '{colors.red.700}', _dark: '{colors.red.300}' } },
    },
    success: {
      DEFAULT: { value: { _light: '{colors.green.700}', _dark: '{colors.green.300}' } },
    },
  },
}
```

---

## Проверка контраста

### Chrome DevTools

1. Открой DevTools → Elements
2. Выбери элемент с текстом
3. В Styles найди `color`
4. Кликни на цветной квадрат
5. Увидишь контраст и соответствие AA/AAA

### Инструменты

| Инструмент                                                               | Описание             |
| ------------------------------------------------------------------------ | -------------------- |
| [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) | Проверка пары цветов |
| [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/) | Desktop приложение   |
| axe DevTools                                                             | Расширение браузера  |
| Lighthouse                                                               | Встроено в Chrome    |

---

## Рекомендации для компонентов

### Кнопки

```typescript
button: defineRecipe({
  variants: {
    variant: {
      solid: {
        // Контраст текста на цветном фоне
        bg: 'colorPalette.600', // Темнее
        color: 'white',
        _hover: { bg: 'colorPalette.700' },
      },
      outline: {
        // Толще граница для видимости
        borderWidth: '2px',
        borderColor: 'colorPalette.500',
      },
    },
  },
})
```

### Ссылки

```tsx
// Не только цветом — добавь подчёркивание
<Link color="blue.600" textDecoration="underline" _dark={{ color: 'blue.300' }}>
  Ссылка
</Link>
```

### Формы

```typescript
// Чёткие границы полей
input: defineRecipe({
  base: {
    borderWidth: '1px',
    borderColor: 'border',
    _focus: {
      borderColor: 'colorPalette.500',
      boxShadow: '0 0 0 1px var(--chakra-colors-colorPalette-500)',
    },
    _invalid: {
      borderColor: 'error',
      borderWidth: '2px', // Толще для ошибок
    },
  },
})
```

### Placeholder текст

```typescript
// Placeholder должен быть достаточно контрастным
semanticTokens: {
  colors: {
    fg: {
      placeholder: {
        value: {
          _light: '{colors.gray.500}',  // Минимум 4.5:1
          _dark: '{colors.gray.500}',
        },
      },
    },
  },
}
```

---

## Focus индикаторы

Focus должен быть **всегда** видимым:

```typescript
// Глобальные стили
globalCss: {
  '*:focus-visible': {
    outline: '2px solid',
    outlineColor: 'colorPalette.500',
    outlineOffset: '2px',
  },
}

// Или в recipe
button: defineRecipe({
  base: {
    _focusVisible: {
      outline: '2px solid',
      outlineColor: 'blue.500',
      outlineOffset: '2px',
    },
  },
})
```

---

## Чеклист доступности цветов

- [ ] Текст имеет контраст ≥ 4.5:1 (AA)
- [ ] Крупный текст имеет контраст ≥ 3:1 (AA)
- [ ] UI компоненты имеют контраст ≥ 3:1
- [ ] Информация передаётся не только цветом
- [ ] Focus индикаторы видны
- [ ] Протестировано в dark mode
- [ ] Протестировано с `prefers-contrast: more`
- [ ] Placeholder достаточно контрастный
- [ ] Ошибки видны не только по цвету (иконка, текст)

---

## Примеры проблем и решений

### Проблема: Серый текст на сером фоне

```tsx
// ❌ Низкий контраст
<Box bg="gray.100">
  <Text color="gray.400">Текст</Text>  {/* ~2:1 */}
</Box>

// ✅ Достаточный контраст
<Box bg="gray.100">
  <Text color="gray.700">Текст</Text>  {/* ~7:1 */}
</Box>
```

### Проблема: Только цвет для ошибок

```tsx
// ❌ Только цвет
<Text color="red.500">Неверный email</Text>

// ✅ Цвет + иконка + контекст
<HStack color="error.fg">
  <Icon as={LuAlertCircle} />
  <Text>Неверный формат email</Text>
</HStack>
```

### Проблема: Невидимый focus

```tsx
// ❌ Отключённый outline
<Button _focus={{ outline: 'none' }}>Click</Button>

// ✅ Кастомный видимый focus
<Button
  _focusVisible={{
    outline: '2px solid',
    outlineColor: 'blue.500',
    outlineOffset: '2px',
  }}
>
  Click
</Button>
```

## См. также

- [semantic-tokens.md](semantic-tokens.md) — Токены с условиями
- [dark-mode.md](dark-mode.md) — Dark mode
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
