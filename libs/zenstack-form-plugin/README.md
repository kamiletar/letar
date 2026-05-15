# @letar/zenstack-form-plugin

ZenStack плагин для генерации Zod схем с UI метаданными из `schema.zmodel`.

[English documentation](./README.en.md)

## Установка

```bash
npm install -D @letar/zenstack-form-plugin
```

> В монорепозитории Lena плагин уже подключён — отдельная установка не требуется.

## Конфигурация

Добавьте плагин в `schema.zmodel`:

```zmodel
plugin formSchema {
  provider = '@letar/zenstack-form-plugin'
  output = './src/generated/form-schemas'
}
```

> В монорепозитории Lena используйте относительный путь: `provider = '../../libs/zenstack-form-plugin/dist/index.js'`

### i18n (опционально)

Для мультиязычных приложений добавьте опции i18n:

```zmodel
plugin formSchema {
  provider = '@letar/zenstack-form-plugin'
  output = './src/generated/form-schemas'

  // i18n настройки
  i18n = true                           // Включить генерацию i18nKey
  i18nOutput = './messages/form-schemas' // Путь к файлам переводов
  defaultLocale = 'ru'                  // Локаль по умолчанию (перезаписывается)
  locales = 'ru,en'                     // Список локалей через запятую
}
```

При `i18n = true` плагин:

1. Добавляет `i18nKey` в `.meta({ ui: { ... } })` каждого поля
2. Генерирует JSON файлы переводов для каждой локали
3. Генерирует TypeScript файл с типами ключей

**Генерируемые файлы:**

```
messages/form-schemas/
├── ru.json    # Переводы на русском (defaultLocale — перезаписывается)
├── en.json    # Переводы на английском (merge-стратегия — сохраняет существующие)
└── keys.ts    # TypeScript типы ключей
```

**Пример ru.json:**

```json
{
  "Product": {
    "name": { "title": "Название товара", "placeholder": "Введите название" }
  },
  "RecipeType": {
    "SWEET": { "label": "Сладкое" }
  }
}
```

**Пример keys.ts:**

```typescript
export type FormI18nKey = 'Product.name.title' | 'Product.name.placeholder' | 'RecipeType.SWEET.label'
// ...
```

## Использование

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
// enums/RecipeType.form.ts
export const RecipeTypeFormSchema = z.enum(['SWEET', 'SALTY']).meta({
  ui: {
    options: [
      { value: 'SWEET', label: 'Сладкое' },
      { value: 'SALTY', label: 'Солёное' },
    ],
  },
})

export const RecipeTypeLabels = {
  SWEET: 'Сладкое',
  SALTY: 'Солёное',
} as const
```

### Модели с @form.\* директивами

Используйте `///` doc-комментарии **ДО** поля (не после!):

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

Генерирует:

```typescript
// Recipe.form.ts
export const RecipeCreateFormSchema = z.object({
  title: z.string().meta({
    ui: { title: 'Название рецепта', placeholder: 'Введите название' },
  }),
  portions: z
    .number()
    .int()
    .meta({
      ui: { title: 'Количество порций', fieldType: 'numberInput', fieldProps: { min: 1, max: 100 } },
    }),
  tags: z.array(z.string()).meta({
    ui: { title: 'Теги', placeholder: 'Добавить тег...', fieldType: 'tags' },
  }),
})

export const RecipeUpdateFormSchema = RecipeCreateFormSchema.partial()
export const RecipeExcludedFields = ['id', 'createdAt', 'updatedAt'] as const

export type RecipeCreateForm = z.infer<typeof RecipeCreateFormSchema>
export type RecipeUpdateForm = z.infer<typeof RecipeUpdateFormSchema>
```

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
> Используйте `@form.relation` для создания select-поля или `@form.exclude` для исключения.

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

## Сборка плагина

При изменении кода плагина необходимо пересобрать:

```bash
nx build zenstack-form-plugin --skip-nx-cache
```

Затем запустить генерацию:

```bash
nx zenstack:generate <app-name>
```

## Поддерживаемые типы Prisma

| Prisma тип | Zod тип                              |
| ---------- | ------------------------------------ |
| String     | `z.string()`                         |
| Int        | `z.number().int()`                   |
| Float      | `z.number()`                         |
| Decimal    | `z.number()`                         |
| BigInt     | `z.bigint()`                         |
| Boolean    | `z.boolean()`                        |
| DateTime   | `z.date()`                           |
| Json       | `z.unknown()`                        |
| Bytes      | `z.unknown()`                        |
| Enum       | `EnumNameFormSchema` (импортируется) |

## Стратегия обновления переводов

При перегенерации i18n файлов:

| Локаль          | Стратегия      | Описание                                                                   |
| --------------- | -------------- | -------------------------------------------------------------------------- |
| `defaultLocale` | **Перезапись** | Полностью перезаписывается из схемы                                        |
| Другие локали   | **Merge**      | Сохраняет существующие переводы, добавляет новые ключи, удаляет устаревшие |

> **Примечание:** Дефолтная локаль по умолчанию — `en`. Для русскоязычных проектов явно указывайте `defaultLocale = 'ru'`.

## Кастомные переводы валидации

Встроены переводы для `en` и `ru`. Для других языков создайте файл:

```typescript
// i18n/form-validations.js
export default {
  de: {
    required: 'Pflichtfeld',
    too_small: { string: 'Mindestens {minimum} Zeichen', ... },
    // Полный интерфейс: ValidationTranslations из @letar/zenstack-form-plugin
  },
}
```

И укажите путь в конфигурации:

```zmodel
plugin formSchema {
  provider = '@letar/zenstack-form-plugin'
  i18n = true
  defaultLocale = 'ru'
  locales = 'ru,en,de'
  validationTranslationsPath = './i18n/form-validations.js'
}
```

**Приоритет:** кастомный файл → встроенные (en, ru) → fallback на английский.

Это позволяет переводчикам работать с en.json без потери изменений при перегенерации.

## AI Tooling (MCP)

MCP сервер [`@letar/form-mcp`](../form-mcp/README.md) предоставляет AI-ассистентам доступ к документации всех @form.\* директив через tool `get_directives`.

## Версия

v2.1.0
