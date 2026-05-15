# @form.\* директивы

Используй `///` doc-комментарии **ДО** поля (не после!) для настройки генерации форм.

## Поддерживаемые директивы

| Директива                  | Описание            | Пример                                       |
| -------------------------- | ------------------- | -------------------------------------------- |
| `@form.title("...")`       | Заголовок поля      | `/// @form.title("Название")`                |
| `@form.placeholder("...")` | Placeholder         | `/// @form.placeholder("Введите...")`        |
| `@form.description("...")` | Описание поля       | `/// @form.description("Подсказка")`         |
| `@form.fieldType("...")`   | Тип компонента      | `/// @form.fieldType("tags")`                |
| `@form.props({...})`       | Constraints + props | `/// @form.props({ min: 1, max: 100 })`      |
| `@form.relation({...})`    | Настройки relation  | `/// @form.relation({ labelField: "name" })` |
| `@form.exclude`            | Исключить из формы  | `/// @form.exclude`                          |

## Примеры

### Базовое использование

```zmodel
model Recipe {
  id          String @id @default(cuid())

  /// @form.title("Название рецепта")
  /// @form.placeholder("Введите название")
  title       String

  /// @form.title("Количество порций")
  /// @form.fieldType("numberInput")
  /// @form.props({ min: 1, max: 100 })
  portions    Int @default(1)

  /// @form.title("Теги")
  /// @form.fieldType("tags")
  /// @form.placeholder("Добавить тег...")
  tags        String[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Enum с метками

Doc-комментарии `///` перед значениями enum становятся метками:

```zmodel
enum RecipeType {
  /// Сладкое
  SWEET
  /// Солёное
  SALTY
}
```

Генерирует:

```typescript
export const RecipeTypeFormSchema = z.enum(['SWEET', 'SALTY']).meta({
  ui: {
    options: [
      { value: 'SWEET', label: 'Сладкое' },
      { value: 'SALTY', label: 'Солёное' },
    ],
  },
})
```

## Автоматическое разделение @form.props

Плагин автоматически разделяет `@form.props` на:

**Zod constraints** — становятся методами схемы:

- `min`, `max`, `step` → `.min()`, `.max()`, `.multipleOf()`
- `minLength`, `maxLength` → `.min()`, `.max()` для строк
- `pattern` → `.regex()`
- `email`, `url`, `uuid` → `.email()`, `.url()`, `.uuid()`

**UI props** — остаются в `fieldProps`:

- `count`, `allowHalf` (для rating)
- `showValue`, `layout` (для slider, radioCard)
- Любые другие props

```zmodel
/// @form.props({ min: 1, max: 100, showValue: true })
portions Int
```

Генерирует:

```typescript
portions: z.number()
  .int()
  .min(1)
  .max(100)
  .meta({ ui: { fieldProps: { showValue: true } } })
```

## Автоматически исключаемые поля

- `id` — первичные ключи
- `createdAt`, `updatedAt` — системные поля
- Поля с атрибутом `@id`
- Поля с атрибутом `@relation` (relation поля)
- Поля, ссылающиеся на модели (например `info RecipeInfo?`)
- Поля с директивой `@form.exclude`

> **Примечание:** FK поля (`categoryId`, `userId`, etc.) не исключаются автоматически.
> Используй `@form.relation` для создания select-поля или `@form.exclude` для исключения.

## Важно: формат комментариев

ZenStack связывает doc-комментарии `///` с СЛЕДУЮЩИМ за ними элементом.

**Правильно:**

```zmodel
/// @form.title("Название")
title String
```

**Неправильно:**

```zmodel
title String
/// @form.title("Название")  // Привяжется к следующему полю!
```

## Генерируемые файлы

```
src/generated/form-schemas/
├── index.ts                    # Реэкспорт всех схем
├── enums/
│   └── RecipeType.form.ts      # Enum схемы с метками
├── Recipe.form.ts              # Model схемы
└── ...
```

## Команды

```bash
# Сборка плагина (при изменении кода плагина)
nx build zenstack-form-plugin --skip-nx-cache

# Генерация схем
nx zenstack:generate <app-name>
```
