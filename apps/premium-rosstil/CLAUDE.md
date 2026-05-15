# CLAUDE.md — Premium Rosstil

Специфичные правила для premium-rosstil. Общие правила см. в корневом `/CLAUDE.md`.

## Фирменный цвет

- **Золотой**: `#CA9E67`
- Используй `colorPalette="fg"` для **ВСЕХ** кнопок по умолчанию
- НЕ используй `colorPalette="blue"`

```tsx
// Правильно
<Button colorPalette="fg">Добавить в корзину</Button>

// Неправильно
<Button colorPalette="blue">Добавить в корзину</Button>
```

## Эталонная реализация

- `/admin/test-models` — шаблон для новых CRUD функций
