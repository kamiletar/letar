# @form.\* директивы

Используй `///` doc-комментарии **ДО** поля (не после!) для настройки генерации форм.

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

⚠️ **Ограничения валидации (`min`/`max`/`minLength`/`pattern`/`email` и т.п.) задавай нативными
атрибутами ZModel (`@gte`/`@lte`/`@length`/`@regex`/`@email`), не через `@form.props`** — см.
раздел «Constraints: нативные атрибуты — рекомендуемый путь» ниже. `@form.props` для constraints —
escape hatch для намеренных расхождений клиент/сервер, не основной механизм.

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
  portions    Int @default(1) @gte(1) @lte(100)

  /// @form.title("Теги")
  /// @form.fieldType("tags")
  /// @form.placeholder("Добавить тег...")
  tags        String[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Enum с метками

⚠️ Отдельной директивы `@form.label` **не существует** — `form-mcp.get_directives('@form.label')`
возвращает пусто. Локализованные лейблы enum-значений задаются doc-комментариями `///`
**на самих значениях enum** (не на поле модели):

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
/// @form.title("Количество порций")
/// @form.fieldType("numberInput")
/// @form.props({ showValue: true })
portions Int @gte(1) @lte(100)
```

Генерирует:

```typescript
portions: z.number()
  .int()
  .min(1)
  .max(100)
  .meta({ ui: { title: 'Количество порций', fieldType: 'numberInput', fieldProps: { showValue: true } } })
```

`@form.props` здесь несёт только UI-пропс (`showValue`) — у ZModel для него нет аналога.

### `@form.props` для constraints — escape hatch

Constraint-ключ в `@form.props` (`min`/`max`/`minLength`/`maxLength`/`pattern`/`email`/`url`/
`uuid`/`exclusiveMin`/`exclusiveMax`) **побеждает** нативный атрибут при конфликте того же ключа
на одном поле. Это не основной механизм, а осознанный выход для трёх постоянных случаев:

1. **Общая библиотечная схема, разный контекст у потребителей** — общий миксин задаёт нативный
   атрибут для большинства, конкретное приложение переопределяет через `@form.props` в своей
   форме, не форкая общую модель.
2. **Валидация до нормализации ≠ после** — нативный атрибут описывает хранимый формат (E.164 для
   телефона), форма принимает то, что печатает пользователь, до normalize-transform. Это не
   мягче/строже, а другой constraint для другого этапа пайплайна.
3. **Осознанный staged rollout** — ужесточили нативный атрибут для целостности данных на будущее,
   но конкретная legacy-форма ещё не готова показать это пользователю (не согласован UX-текст) —
   `@form.props` временно держит форму мягче, пока его явно не уберут.

Если конфликт не подпадает ни под один из трёх случаев — это дрейф, а не намерение: дублирующий
`@form.props`-ключ можно вычистить (не гейт, просто устаревший паттерн для нового кода).

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
