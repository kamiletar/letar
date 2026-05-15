# Form History (Undo/Redo)

Хук `useFormHistory()` и компонент `HistoryControls` для отмены/повтора изменений в формах.

## Быстрый старт

```tsx
import { HistoryControls, useFormHistory } from '@letar/forms'

function ProductForm() {
  const form = useDeclarativeForm()
  const history = useFormHistory(form)

  return (
    <Form schema={ProductSchema} onSubmit={save}>
      <HistoryControls history={history} />
      <Form.Field.String name="title" />
      <Form.Field.RichText name="description" />
      <Form.Button.Submit>Сохранить</Form.Button.Submit>
    </Form>
  )
}
```

Ctrl+Z / Ctrl+Y работают автоматически.

## API

### useFormHistory(form, config?)

```typescript
const history = useFormHistory(form, {
  maxHistory: 50, // Макс. снапшотов (по умолчанию 50)
  debounceMs: 500, // Задержка перед записью (по умолчанию 500мс)
  keyboard: true, // Ctrl+Z / Ctrl+Y (по умолчанию true)
  persist: false, // sessionStorage (по умолчанию false)
  persistKey: 'form-history', // Ключ для sessionStorage
})
```

**Возвращает:**

| Поле            | Тип              | Описание                     |
| --------------- | ---------------- | ---------------------------- |
| `undo`          | `() => void`     | Отменить последнее действие  |
| `redo`          | `() => void`     | Повторить отменённое         |
| `canUndo`       | `boolean`        | Есть что отменять            |
| `canRedo`       | `boolean`        | Есть что повторять           |
| `currentIndex`  | `number`         | Позиция в истории            |
| `historyLength` | `number`         | Всего снапшотов              |
| `clear`         | `() => void`     | Очистить историю             |
| `history`       | `HistoryEntry[]` | Полная история (для отладки) |

### HistoryControls

```tsx
<HistoryControls
  history={historyApi}
  showCounter // Показать "3/7" счётчик
  size="sm" // Размер кнопок: xs | sm | md
/>
```

## Как работает

1. Хук подписывается на `form.store` (TanStack Form reactive store)
2. При изменении — debounce 500ms → `structuredClone` снапшот
3. Undo/Redo применяет снапшот через `form.setFieldValue` для каждого поля
4. Изменения от undo/redo не записываются в историю (защита от рекурсии)
5. При ветвлении (undo → изменение) будущие записи обрезаются

## Keyboard Shortcuts

| Комбинация                     | Действие            |
| ------------------------------ | ------------------- |
| `Ctrl+Z` / `Cmd+Z`             | Undo                |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo                |
| `Ctrl+Y`                       | Redo (альтернатива) |

Отключение: `keyboard: false`.

## Persistence

```tsx
const history = useFormHistory(form, {
  persist: true,
  persistKey: 'product-form-history',
})
```

История сохраняется в `sessionStorage` и восстанавливается при перезагрузке страницы (в рамках сессии браузера).
