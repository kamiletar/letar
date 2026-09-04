# @letar/zenstack-form-plugin

ZenStack плагин для генерации Zod схем с UI метаданными из `schema.zmodel`.

[English documentation](./README.en.md)

## Установка

```bash
npm install -D @letar/zenstack-form-plugin
```

> В монорепозитории Letar плагин уже подключён — отдельная установка не требуется.

## Конфигурация

Добавьте плагин в `schema.zmodel`:

```zmodel
plugin formSchema {
  provider = '@letar/zenstack-form-plugin'
  output = './src/generated/form-schemas'
}
```

> В монорепозитории Letar используйте относительный путь: `provider = '../../libs/zenstack-form-plugin/dist/index.js'`

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
  portions    Int @default(1) @gte(1) @lte(100)

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

| Директива                  | Описание                                 | Пример                                       |
| -------------------------- | ---------------------------------------- | -------------------------------------------- |
| `@form.title("...")`       | Заголовок поля                           | `/// @form.title("Название")`                |
| `@form.placeholder("...")` | Placeholder                              | `/// @form.placeholder("Введите...")`        |
| `@form.description("...")` | Описание поля                            | `/// @form.description("Подсказка")`         |
| `@form.fieldType("...")`   | Тип компонента                           | `/// @form.fieldType("tags")`                |
| `@form.props({...})`       | UI-пропсы + escape hatch для constraints | `/// @form.props({ showValue: true })`       |
| `@form.relation({...})`    | Настройки relation                       | `/// @form.relation({ labelField: "name" })` |
| `@form.exclude`            | Исключить из формы                       | `/// @form.exclude`                          |

## Constraints: нативные ZModel-атрибуты — рекомендуемый путь

**Задавайте валидацию через нативные атрибуты ZModel, не через `@form.props`.** ORM уже применяет
их на `create`/`update` через `@zenstackhq/zod` — плагин форм наследует те же constraints в
клиентскую Zod-схему, так что источник валидации остаётся один:

| ZModel-атрибут      | Zod-constraint                     |
| ------------------- | ---------------------------------- |
| `@email`            | `.email()`                         |
| `@length(min, max)` | `.min(min)` / `.max(max)` (строки) |
| `@gte(x)`           | `.min(x)` (включительно)           |
| `@gt(x)`            | `.gt(x)` (строго больше)           |
| `@lte(x)`           | `.max(x)` (включительно)           |
| `@lt(x)`            | `.lt(x)` (строго меньше)           |
| `@regex("...")`     | `.regex(/.../)`                    |

```zmodel
/// @form.title("Количество порций")
portions Int @gte(1) @lte(100)

/// @form.title("Email")
email String @email
```

Генерирует:

```typescript
portions: z.number().int().min(1).max(100).meta({ ui: { title: 'Количество порций' } })
email: z.string().email().meta({ ui: { title: 'Email' } })
```

Ни одного дублирующего `@form.props({ min, max, ... })` не нужно — форма и ORM валидируют
одинаково, потому что читают одно и то же место схемы.

### `@form.props` для constraints — escape hatch, не основной путь

`@form.props` как источник constraint-значения (`min`/`max`/`minLength`/`maxLength`/`pattern`/
`email`/`url`/`uuid`/`exclusiveMin`/`exclusiveMax`) остаётся рабочим и **побеждает** нативный
атрибут при конфликте того же ключа на одном поле — но это осознанный **escape hatch** для
намеренного расхождения клиент/сервер, не способ задать constraint по умолчанию. UI-пропсы, для
которых у ZModel нет аналога (`showValue`, `layout`, `count`, `allowHalf` и т.п.), в `@form.props`
остаются как есть — это не костыль, просто ZModel про них ничего не знает.

**Три случая, где `@form.props` осмысленно побеждает нативный атрибут как постоянный паттерн**
(не только «уже так написано раньше»):

1. **Общая библиотечная схема, разный контекст у потребителей.** Общий миксин (например
   `@letar/zenstack-fragments`) задаёт нативный атрибут, подходящий большинству приложений
   (`@length(1, 200)` для generic-поля). Конкретное приложение переопределяет через `@form.props`
   в своей форме, не форкая общую модель, — постоянная точка кастомизации per-consumer.
2. **Валидация до нормализации ≠ валидация после.** Нативный атрибут (`@regex`) часто описывает
   **хранимый** формат (телефон в E.164 — так ORM пишет в БД). Форма принимает то, что реально
   печатает пользователь (произвольный формат), а normalize-transform приводит к хранимому
   формату уже после валидации формы, перед отправкой на сервер. Здесь `@form.props` — не мягче
   или строже, а **другой** constraint, потому что применяется к другому представлению данных на
   другом этапе пайплайна.
3. **Осознанный staged rollout нового серверного ограничения.** Ужесточили нативный атрибут
   (`@gte(18)` вместо `@gte(0)`) для целостности данных на будущее, но конкретная форма в
   legacy-части приложения ещё не готова показывать это пользователю (не согласован UX-текст, идёт
   постепенный вывод старого флоу) — форма временно остаётся мягче через `@form.props`, пока его
   явно не уберут. Отличие от случайного дрейфа — расхождение осознанное и временное.

Пример UI-пропса рядом с нативным constraint (не конфликт, а дополнение):

```zmodel
/// @form.title("Количество порций")
/// @form.fieldType("numberInput")
/// @form.props({ showValue: true })
portions Int @gte(1) @lte(100)
```

```typescript
portions: z.number()
  .int()
  .min(1)
  .max(100)
  .meta({ ui: { title: 'Количество порций', fieldType: 'numberInput', fieldProps: { showValue: true } } })
```

> **Для уже существующего кода:** если на поле уже есть нативный атрибут с тем же значением, что
> и constraint-ключ в `@form.props` (например `@gte(0)` рядом с `@form.props({ min: 0 })`) —
> дублирующий ключ теперь избыточен, можно вычистить по ходу работы. Это не гейт и не
> принудительная миграция — новому коду просто не нужно копировать устаревший паттерн.

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

Версия — в [package.json](package.json) и [CHANGELOG.md](CHANGELOG.md).
