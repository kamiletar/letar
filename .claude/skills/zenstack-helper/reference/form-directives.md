# `@meta("form.*", value)` директивы

С Фазы 4 `zenstack-form-plugin` (v4.0.0) `@meta` — **единственный** синтаксис метаданных формы.
Ставится прямо на поле, без doc-комментария:

```zmodel
title String @meta("form.title", "Название")
```

⚠️ **Legacy-синтаксис** (`///`-комментарий **ДО** поля, `@form.title(...)` и т.п.) убран из
парсера полностью в Фазе 4 — `field.comments` больше не читается вообще ни в каком виде. Схему,
где он ещё встречается, переводит кодмод `scripts/codemods/codemod-form-directives.mjs`
(см. `libs/forms/PLAN.md`, Фаза 3→4), не переписывай вручную.

## ⛔ Объектный литерал в `@meta` ломает `zenstack generate` целиком

```
$ nx zenstack:generate (объект в @meta) → Unhandled error: Unsupported attribute arg value: ObjectExpr
```

Проверено живым прогоном — это ограничение upstream-генератора TS-схемы самого ZenStack, не
нашего плагина. Поэтому `form.props`/`form.relation` (у которых объект был бы естественным
контейнером) заданы **плоским dot-path**, а не объектом:

```zmodel
// ❌ Ломает generate целиком
portions Int @meta("form.props", { min: 1, max: 100 })

// ✅ Работает
portions Int @meta("form.props.min", 1) @meta("form.props.max", 100)
```

Скаляры (строка/число/булево) и **массивы** (в т.ч. вложенные) в `@meta` работают без проблем —
блокирован только «голый» объектный литерал.

## Поддерживаемые ключи

| Ключ `@meta("form.<key>", …)` | Описание                                 | Пример                                      |
| ----------------------------- | ---------------------------------------- | ------------------------------------------- |
| `form.title`                  | Заголовок поля                           | `@meta("form.title", "Название")`           |
| `form.placeholder`            | Placeholder                              | `@meta("form.placeholder", "Введите...")`   |
| `form.description`            | Описание поля                            | `@meta("form.description", "Подсказка")`    |
| `form.fieldType`              | Тип компонента                           | `@meta("form.fieldType", "tags")`           |
| `form.props.<dotpath>`        | UI-пропсы + escape hatch для constraints | `@meta("form.props.showValue", true)`       |
| `form.relation.<dotpath>`     | Настройки relation                       | `@meta("form.relation.labelField", "name")` |
| `form.exclude`                | Исключить из формы                       | `@meta("form.exclude", true)`               |

⚠️ **Ограничения валидации (`min`/`max`/`minLength`/`pattern`/`email` и т.п.) задавай нативными
атрибутами ZModel (`@gte`/`@lte`/`@length`/`@regex`/`@email`), не через `form.props`** — см.
раздел «Constraints: нативные атрибуты — рекомендуемый путь» ниже. `form.props` для constraints —
escape hatch для намеренных расхождений клиент/сервер, не основной механизм.

## Примеры

### Базовое использование

```zmodel
model Recipe {
  id          String @id @default(cuid())

  title       String @meta("form.title", "Название рецепта") @meta("form.placeholder", "Введите название")

  portions    Int @default(1) @gte(1) @lte(100)
    @meta("form.title", "Количество порций") @meta("form.fieldType", "numberInput")

  tags        String[] @meta("form.title", "Теги") @meta("form.fieldType", "tags")
    @meta("form.placeholder", "Добавить тег...")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Legacy-синтаксис (убран в v4.0.0) — для справки при чтении старого кода

Встретишь такое в схеме (или в старом коммите) — это уже не работает, переводи кодмодом:

```zmodel
model Recipe {
  id          String @id @default(cuid())

  /// @form.title("Название рецепта")
  /// @form.placeholder("Введите название")
  title       String

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Enum с метками

⚠️ Отдельной директивы `form.label` **не существует** — `form-mcp.get_directives('form.label')`
возвращает пусто. Локализованные лейблы enum-значений задаются doc-комментариями `///`
**на самих значениях enum** (не на поле модели) — это не покрывается `@meta`, комментарии на
значениях enum остаются единственным механизмом:

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

Плюс отдельный объект `RecipeTypeLabels = { SWEET: 'Сладкое', SALTY: 'Солёное' }` в том же файле.
Без `///`-комментариев плагин генерирует лейбл транслитом из имени значения (`BRUS` → `"Brus"`).

Живой прецедент — `libs/driving-school-db/schema.zmodel`, enum `AbsenceType`, и
`apps/domwellbes/schema.zmodel`, enum `WallMaterial`/`HousePurpose`/`Floors`/`HouseStyle`.

## Constraints: нативные атрибуты — рекомендуемый путь

Генератор форм наследует Zod-constraints напрямую из нативных атрибутов ZModel — того же места,
которое ORM уже применяет на `create`/`update` через `@zenstackhq/zod`. Один источник валидации
вместо двух параллельных:

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
portions Int @gte(1) @lte(100)
  @meta("form.title", "Количество порций") @meta("form.fieldType", "numberInput")
  @meta("form.props.showValue", true)
```

Генерирует:

```typescript
portions: z.number()
  .int()
  .min(1)
  .max(100)
  .meta({ ui: { title: 'Количество порций', fieldType: 'numberInput', fieldProps: { showValue: true } } })
```

`form.props.showValue` здесь несёт только UI-пропс — у ZModel для него нет аналога.

### `form.props` для constraints — escape hatch

Constraint-ключ в `form.props` (`min`/`max`/`minLength`/`maxLength`/`pattern`/`email`/`url`/
`uuid`/`exclusiveMin`/`exclusiveMax`) **побеждает** нативный атрибут при конфликте того же ключа
на одном поле. Это не основной механизм, а осознанный выход для трёх постоянных случаев:

1. **Общая библиотечная схема, разный контекст у потребителей** — общий миксин задаёт нативный
   атрибут для большинства, конкретное приложение переопределяет через `form.props` в своей
   форме, не форкая общую модель.
2. **Валидация до нормализации ≠ после** — нативный атрибут описывает хранимый формат (E.164 для
   телефона), форма принимает то, что печатает пользователь, до normalize-transform. Это не
   мягче/строже, а другой constraint для другого этапа пайплайна.
3. **Осознанный staged rollout** — ужесточили нативный атрибут для целостности данных на будущее,
   но конкретная legacy-форма ещё не готова показать это пользователю (не согласован UX-текст) —
   `form.props` временно держит форму мягче, пока его явно не уберут.

Если конфликт не подпадает ни под один из трёх случаев — это дрейф, а не намерение: дублирующий
`form.props`-ключ можно вычистить (не гейт, просто устаревший паттерн для нового кода).

## Автоматически исключаемые поля

- `id` — первичные ключи
- `createdAt`, `updatedAt` — системные поля
- Поля с атрибутом `@id`
- Поля с атрибутом `@relation` (relation поля)
- Поля, ссылающиеся на модели (например `info RecipeInfo?`)
- Поля с `@meta("form.exclude", true)`

> **Примечание:** FK поля (`categoryId`, `userId`, etc.) не исключаются автоматически.
> Используй `form.relation` для создания select-поля или `form.exclude` для исключения.

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

# Миграция существующей схемы с @form.* на @meta (идемпотентно, --dry-run для превью)
node scripts/codemods/codemod-form-directives.mjs --dry-run apps/<app>/schema.zmodel
node scripts/codemods/codemod-form-directives.mjs apps/<app>/schema.zmodel
```
