# Миграция на @letar/forms 3.0.0

В 3.0.0 из ядра ушли три тяжёлых поля и перетаскивание в списках. Раньше они тянули за собой
`@tiptap/*`, `@tanstack/react-table`, `@dnd-kit/*`, даже если форма ими не пользовалась. Теперь
обязательных peer-зависимостей шесть: `react`, `@chakra-ui/react`, `@tanstack/react-form`,
`framer-motion`, `react-icons`, `zod`. Всё остальное подключается по необходимости.

Версию 2.42.0 можно поставить раньше: в ней уже есть подпути и `extraFields`, а старые способы ещё
работают. Переходите на 2.42.0, меняйте код по таблице ниже, потом ставьте 3.0.0.

## Что изменилось

| Было (2.x)                                                                                                                                        | Стало (3.0.0)                                                                                               | Нужные пакеты                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `<Form.Field.RichText />`, `<AppForm.Field.RichText />`                                                                                           | `createForm({ extraFields: { RichText: FieldRichText } })`, импорт из `@letar/forms/rich-text`              | `@tiptap/*`                              |
| `<Form.Field.DataGrid />`                                                                                                                         | `createForm({ extraFields: { DataGrid: FieldDataGrid } })`, импорт из `@letar/forms/data-grid`              | `@tanstack/react-table`, `react-virtual` |
| `<Form.Field.TableEditor />`                                                                                                                      | `createForm({ extraFields: { TableEditor: FieldTableEditor } })`, импорт из `@letar/forms/table-editor`     | `@dnd-kit/*`                             |
| `<Form.Group.List sortable>`                                                                                                                      | `SortableGroupList` из `@letar/forms/sortable`                                                              | `@dnd-kit/*`                             |
| `Form.Group.List.Button.DragHandle`                                                                                                               | `Button.DragHandle` внутри `SortableGroupList`                                                              | `@dnd-kit/*`                             |
| `import { DragHandle, SortableItem, SortableWrapper, useSortableItemContext } from '@letar/forms'`                                                | то же из `@letar/forms/sortable`                                                                            | `@dnd-kit/*`                             |
| `import { FieldRichText, ToolbarButton, RichTextFieldProps } from '@letar/forms'`                                                                 | то же из `@letar/forms/rich-text`                                                                           | `@tiptap/*`                              |
| `import { FieldDataGrid, FieldTableEditor, TableEditorContext, useTableEditorContext, DataGridColumnDef, TableColumnDef, … } from '@letar/forms'` | то же из `@letar/forms/data-grid` и `@letar/forms/table-editor`                                             | см. выше                                 |
| `AppForm.Field.<любое имя>` компилировалось                                                                                                       | `AppForm.Field.<имя>` — только встроенные поля и те, что есть в `extraFields`; остальное — ошибка typecheck | —                                        |
| `fieldType: 'richText'` в схеме без регистрации рисовал встроенный редактор                                                                       | без регистрации — Textarea и одно предупреждение в dev-консоли на поле                                      | —                                        |
| `Form.DebugValues`, проп `debug`                                                                                                                  | без изменений относительно 2.42.0: простой `<pre>`. Дерево — `FormDebugJsonView` из `@letar/forms/debug`    | `@uiw/react-json-view`                   |

Ключ в `extraFields` обязан совпадать с именем поля (`RichText`, `DataGrid`, `TableEditor`): по нему
работают `AppForm.Field.<Имя>` и автоформа.

## Пример `createForm`

```tsx
import { createForm } from '@letar/forms'
import { FieldDataGrid } from '@letar/forms/data-grid'
import { FieldRichText } from '@letar/forms/rich-text'
import { FieldTableEditor } from '@letar/forms/table-editor'

export const AppForm = createForm({
  extraFields: { RichText: FieldRichText, DataGrid: FieldDataGrid, TableEditor: FieldTableEditor },
})
```

```tsx
// было
<Form.Field.RichText name="body" />
// стало
<AppForm.Field.RichText name="body" />
```

Нужно только одно поле — регистрируйте только его, лишние пакеты ставить не придётся.

## `sortable` у списка

```tsx
// было
<Form.Group.List name="items" sortable>
  <Form.Field.String name="title" />
  <Form.Group.List.Button.DragHandle />
  <Form.Group.List.Button.Remove />
</Form.Group.List>

// стало
import { SortableGroupList } from '@letar/forms/sortable'

<SortableGroupList name="items">
  <Form.Field.String name="title" />
  <SortableGroupList.Button.DragHandle />
  <SortableGroupList.Button.Remove />
</SortableGroupList>
```

У `Form.Group.List` проп `sortable` убран, а `Form.Group.List.Button.DragHandle` в ядре больше нет.

## `richText` в схеме

Поле со `fieldType: 'richText'` в `Form.AutoFields` берёт компонент из `extraFields.RichText`.
Не зарегистрировали — получите Textarea и предупреждение:

```
[@letar/forms] Поле «body» имеет fieldType "richText", но RichText не зарегистрирован в createForm — рисуется Textarea. Подключите редактор: createForm({ extraFields: { RichText: FieldRichText } }), FieldRichText — из '@letar/forms/rich-text'.
```

Предупреждение выводится один раз на поле и только вне production.

## Как проверить

1. `tsc`/`tsgo` на приложении: каждое место с `Form.Field.RichText|DataGrid|TableEditor` и импортом тяжёлых
   символов из корня подсветится ошибкой.
2. Поставьте нужные optional peer (таблица выше).
3. Соберите приложение и посмотрите, что `node_modules/@tiptap` и `@dnd-kit` не нужны, если вы ими не пользуетесь.
