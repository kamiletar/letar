# @letar/zenstack-form-plugin

ZenStack плагин для генерации Zod схем с UI метаданными из `schema.zmodel`.

[English documentation](./README.en.md)

> **v4.0.0 (Фаза 4):** field-атрибут `@meta("form.*", value)`, ставится прямо на поле ZModel —
> единственный синтаксис метаданных формы. Старый синтаксис через doc-комментарий `///
> @form.*(...)` (был deprecated с v3.0.0) убран из парсера целиком — плагин больше не читает
> `field.comments` для UI-метаданных вообще. Мигрируешь схему, где он ещё встречается — используй
> `scripts/codemods/codemod-form-directives.mjs` (см. историю миграции в `CHANGELOG.md`).

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

### Модели с `@meta("form.*", value)` директивами

С Фазы 3 (v3.0.0) основной синтаксис — **field-атрибут** `@meta`, ставится прямо на поле, без
doc-комментария:

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
    .min(1)
    .max(100)
    .meta({
      ui: { title: 'Количество порций', fieldType: 'numberInput' },
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

## Поддерживаемые ключи `@meta`

| Ключ `@meta("form.<key>", …)` | Описание                                 | Пример                                      |
| ----------------------------- | ---------------------------------------- | ------------------------------------------- |
| `form.title`                  | Заголовок поля                           | `@meta("form.title", "Название")`           |
| `form.placeholder`            | Placeholder                              | `@meta("form.placeholder", "Введите...")`   |
| `form.description`            | Описание поля                            | `@meta("form.description", "Подсказка")`    |
| `form.fieldType`              | Тип компонента                           | `@meta("form.fieldType", "tags")`           |
| `form.props.<dotpath>`        | UI-пропсы + escape hatch для constraints | `@meta("form.props.showValue", true)`       |
| `form.relation.<dotpath>`     | Настройки relation                       | `@meta("form.relation.labelField", "name")` |
| `form.exclude`                | Исключить из формы                       | `@meta("form.exclude", true)`               |

⚠️ **Объектный литерал в `@meta` ломает `zenstack generate` целиком** (`Unhandled error:
Unsupported attribute arg value: ObjectExpr`) — это ограничение upstream-генератора TS-схемы
самого ZenStack, не плагина. Поэтому `form.props`/`form.relation`, у которых раньше был объект
(`@form.props({ min: 1, max: 100 })`), теперь задаются **плоским dot-path**, по одному `@meta` на
ключ:

```zmodel
// ❌ Ломает generate целиком
portions Int @meta("form.props", { min: 1, max: 100 })

// ✅ Работает
portions Int @meta("form.props.min", 1) @meta("form.props.max", 100)
```

Скаляры (строка/число/булево) и массивы в `@meta` работают без проблем — блокирован только
«голый» объектный литерал.

### Legacy-синтаксис (`///`-комментарий) — убран в v4.0.0

Старый синтаксис через doc-комментарий `///` перед полем (`@form.title(...)` и т.п.) **больше не
поддерживается**. `parseFormMeta`/`mergeFormMeta` удалены из `parser.ts` — `field.comments` не
читается вообще, ни в каком виде. Схему с ещё живыми `@form.*`-комментариями переводит
идемпотентный кодмод `scripts/codemods/codemod-form-directives.mjs` (флаг `--dry-run` для
превью) — не переписывай директивы вручную. Таблица соответствия — на случай, если под рукой
только старая схема без кодмода:

⚠️ **Исключение без замены** — `@form.props({ options: [{value,label}, ...] })` (массив объектов).
Кодмод его не конвертировал (см. раздел ниже) и после v4.0.0 он больше не работает вообще —
единственный оставшийся синтаксис не может его выразить. Такое поле нужно перевести на настоящий
ZModel `enum` (см. ниже), а не оставлять на старом синтаксисе — оставлять уже некуда.

| Legacy-директива           | Аналог в `@meta`                                     |
| -------------------------- | ---------------------------------------------------- |
| `@form.title("...")`       | `@meta("form.title", "...")`                         |
| `@form.placeholder("...")` | `@meta("form.placeholder", "...")`                   |
| `@form.description("...")` | `@meta("form.description", "...")`                   |
| `@form.fieldType("...")`   | `@meta("form.fieldType", "...")`                     |
| `@form.props({...})`       | `@meta("form.props.<key>", value)` на каждый ключ    |
| `@form.relation({...})`    | `@meta("form.relation.<key>", value)` на каждый ключ |
| `@form.exclude`            | `@meta("form.exclude", true)`                        |

## Constraints: нативные ZModel-атрибуты — рекомендуемый путь

**Задавайте валидацию через нативные атрибуты ZModel, не через `form.props`.** ORM уже применяет
их на `create`/`update` через `@zenstackhq/zod` — плагин форм наследует те же constraints в
клиентскую Zod-схему, так что источник валидации остаётся один:

| ZModel-атрибут       | Zod-constraint                                                                 |
| -------------------- | ------------------------------------------------------------------------------ |
| `@email`             | `.email()`                                                                     |
| `@length(min, max)`  | `.min(min)` / `.max(max)` (строки и списки)                                    |
| `@gte(x)`            | `.min(x)` (включительно)                                                       |
| `@gt(x)`             | `.gt(x)` (строго больше)                                                       |
| `@lte(x)`            | `.max(x)` (включительно)                                                       |
| `@lt(x)`             | `.lt(x)` (строго меньше)                                                       |
| `@regex("...")`      | `.regex(/.../)`                                                                |
| `@startsWith("...")` | `.startsWith(...)`                                                             |
| `@endsWith("...")`   | `.endsWith(...)`                                                               |
| `@contains("...")`   | `.includes(...)`                                                               |
| `@datetime`          | `.datetime()`                                                                  |
| `@date`              | `.date()`                                                                      |
| `@time(precision?)`  | `.time()` / `.time({ precision })`                                             |
| `@url`               | `.url()`                                                                       |
| `@phone`             | телефон как строка (валидируется через `ZodUtils`, формат не диктуется формой) |
| `@trim`              | `.trim()`                                                                      |
| `@lower`             | `.toLowerCase()`                                                               |
| `@upper`             | `.toUpperCase()`                                                               |

`Decimal`-поля не поддерживают эти атрибуты через нативный путь (несовместимость
`ZodUtils.addDecimalValidation` с контрактом `Decimal → z.number()` формы) — для них по-прежнему
работают только `@gte`/`@gt`/`@lte`/`@lt`.

```zmodel
portions Int @gte(1) @lte(100) @meta("form.title", "Количество порций")

email String @email @meta("form.title", "Email")
```

Генерирует:

```typescript
portions: z.number().int().min(1).max(100).meta({ ui: { title: 'Количество порций' } })
email: z.string().email().meta({ ui: { title: 'Email' } })
```

Ни одного дублирующего `form.props`-ключа не нужно — форма и ORM валидируют одинаково, потому что
читают одно и то же место схемы.

### Кастомный текст ошибки — последний позиционный `message`, не `@meta` (v3.1.0)

Все атрибуты из таблицы выше (кроме `@trim`/`@lower`/`@upper` — они не могут провалиться) и
числовые `@gte`/`@gt`/`@lte`/`@lt` принимают последним позиционным аргументом строку `message`,
как в стандартной библиотеке ZModel:

```zmodel
price Int @gte(0, "Цена не может быть отрицательной") @meta("form.title", "Цена")

email String @email("Введите настоящий email") @meta("form.title", "Email")
```

```typescript
price: z.number().int().min(0, 'Цена не может быть отрицательной').meta({ ui: { title: 'Цена' } })
```

`message` — не `@meta`-ключ, он остаётся частью самого нативного атрибута ZModel. Для `@length`
один `message` применяется к обеим границам (`min` и `max`), если заданы обе.

⚠️ Пока это только литеральная строка, без i18n-резолюции ключа (в отличие от `title`/
`placeholder`, у которых есть `i18nKey`) — см. `libs/forms/PLAN.md`.

### `form.props` для constraints — escape hatch, не основной путь

`form.props.<constraint-ключ>` (`min`/`max`/`minLength`/`maxLength`/`pattern`/`email`/`url`/`uuid`/
`exclusiveMin`/`exclusiveMax`) остаётся рабочим и **побеждает** нативный атрибут при конфликте
того же ключа на одном поле — но это осознанный **escape hatch** для намеренного расхождения
клиент/сервер, не способ задать constraint по умолчанию. UI-пропсы, для которых у ZModel нет
аналога (`showValue`, `layout`, `count`, `allowHalf` и т.п.), в `form.props` остаются как есть —
это не костыль, просто ZModel про них ничего не знает.

**Три случая, где `form.props` осмысленно побеждает нативный атрибут как постоянный паттерн**
(не только «уже так написано раньше»):

1. **Общая библиотечная схема, разный контекст у потребителей.** Общий миксин (например
   `@letar/zenstack-fragments`) задаёт нативный атрибут, подходящий большинству приложений
   (`@length(1, 200)` для generic-поля). Конкретное приложение переопределяет через
   `@meta("form.props.<key>", value)` в своей форме, не форкая общую модель, — постоянная точка
   кастомизации per-consumer.
2. **Валидация до нормализации ≠ валидация после.** Нативный атрибут (`@regex`) часто описывает
   **хранимый** формат (телефон в E.164 — так ORM пишет в БД). Форма принимает то, что реально
   печатает пользователь (произвольный формат), а normalize-transform приводит к хранимому
   формату уже после валидации формы, перед отправкой на сервер. Здесь `form.props` — не мягче
   или строже, а **другой** constraint, потому что применяется к другому представлению данных на
   другом этапе пайплайна.
3. **Осознанный staged rollout нового серверного ограничения.** Ужесточили нативный атрибут
   (`@gte(18)` вместо `@gte(0)`) для целостности данных на будущее, но конкретная форма в
   legacy-части приложения ещё не готова показывать это пользователю (не согласован UX-текст, идёт
   постепенный вывод старого флоу) — форма временно остаётся мягче через `form.props`, пока его
   явно не уберут. Отличие от случайного дрейфа — расхождение осознанное и временное.

Пример UI-пропса рядом с нативным constraint (не конфликт, а дополнение):

```zmodel
portions Int @gte(1) @lte(100)
  @meta("form.title", "Количество порций") @meta("form.fieldType", "numberInput")
  @meta("form.props.showValue", true)
```

```typescript
portions: z.number()
  .int()
  .min(1)
  .max(100)
  .meta({ ui: { title: 'Количество порций', fieldType: 'numberInput', fieldProps: { showValue: true } } })
```

> **Для уже существующего кода:** если на поле уже есть нативный атрибут с тем же значением, что
> и constraint-ключ в `form.props` (например `@gte(0)` рядом с `@meta("form.props.min", 0)`) —
> дублирующий ключ теперь избыточен, можно вычистить по ходу работы. Это не гейт и не
> принудительная миграция — новому коду просто не нужно копировать устаревший паттерн.

### Массив объектов (`options: [{ value, label }]`) — используй настоящий `enum`, не `String`

`@meta` не может выразить объектный литерал в значении атрибута (`ObjectExpr` роняет
`zenstack generate` целиком — см. `metaValueToPlain` в `src/parser.ts`), а плоский dot-path не
индексируется по массиву объектов (`form.props.options.0.value` не работает). До v4.0.0 у этого
был единственный обходной путь — legacy comment-директива (`@form.props({ options: [...] })`),
которая объекты не разбирала как `@meta`-атрибут, а хранила строкой. С удалением legacy-парсера в
v4.0.0 этот путь исчез без замены — для select-поля с фиксированным списком `{ value, label }[]`
теперь единственный правильный способ — настоящий ZModel `enum` вместо `String`:

```zmodel
// ❌ Больше не работает никак — comment-синтаксис убран
category String
  /// @form.props({ options: [{ value: "fruit", label: "Фрукты" }, { value: "veg", label: "Овощи" }] })

// ✅ Значения — варианты enum, label — /// doc-комментарий на каждом (extractEnumLabel)
enum ProductCategory {
  /// Фрукты
  FRUIT
  /// Овощи
  VEGETABLE
}

model Product {
  category ProductCategory @meta("form.title", "Категория")
}
```

Опции для select собираются автоматически из значений enum (`extractEnumLabel`/
`enum-generator.ts`) — отдельный `@meta("form.props.options", …)` для этого не нужен вовсе.
Живой прецедент — `Content.category`/`Content.quality`/`Report.reason` в `animatrona-tracker` и
`Settings.torrentBackend` в `animatrona` (2026-09, Фаза 3→4 миграции): все четыре поля были
`String` с `options`-массивом объектов на legacy-синтаксисе, переведены на `enum` при удалении
парсера.

### Warning на неизвестную директиву (v3.2.0)

`@meta("form.<key>", …)` молча игнорирует любой `<key>`, не входящий в распознаваемый набор
(`title`/`placeholder`/`description`/`fieldType`/`props`/`relation`/`exclude`) — опечатка или
несуществующая директива (`@form.options`, `@form.widget`) не даёт ошибки ни на этапе
`zenstack generate`, ни при типизации: поле просто остаётся без нужных метаданных. С v3.2.0
`nx zenstack:generate` печатает `console.warn` для каждого такого случая — с именем модели/поля,
самим неизвестным ключом и списком поддерживаемых. Не ломает сборку, только предупреждает.

## Кросс-полевая валидация: `@@validate` (Фаза 2, v2.5.0)

Проверки, зависящие от нескольких полей сразу, задаются на уровне модели, не поля:

```zmodel
model Booking {
  id       String   @id @default(cuid())
  title    String
  startsAt DateTime
  endsAt   DateTime

  @@validate(endsAt > startsAt, "Дата окончания раньше начала", ["endsAt"])
}
```

Генерирует:

```typescript
export const BookingCreateFormSchema = withNative(
  BookingBaseSchema,
  (s) => ZodUtils.addCustomValidation(s, [{ name: '@@validate', args: [
    { value: /* сериализованное выражение endsAt > startsAt */ },
    { value: { kind: 'literal', value: 'Дата окончания раньше начала' } },
    { value: { kind: 'array', type: 'String', items: [{ kind: 'literal', value: 'endsAt' }] } },
  ] }]),
)
```

Сигнатура — `@@validate(condition: Boolean, message: String?, path: String[]?)`, как в стандартной
библиотеке ZModel. `condition` — произвольное булево выражение над полями модели (сравнения,
`&&`/`||`, вызовы `length`/`startsWith`/... — всё, что умеет распознать `serializeExpression` в
`model-generator.ts`). `message`/`path` — как у Zod `.refine()`: `path` привязывает ошибку к
конкретному полю формы вместо общей ошибки формы.

**Ограничения:**

- **Только `{Model}CreateFormSchema`.** `{Model}UpdateFormSchema` строится из внутреннего
  `{Model}BaseSchema` (до `.refine()`) через `.partial()` — у `ZodEffects`, которую возвращает
  `.refine()`, нет метода `.partial()`, а частичный payload часто физически не может
  удовлетворить проверке, рассчитанной на полную модель. Если форме редактирования тоже нужна
  эта проверка — добавляйте её отдельно на уровне формы (`@letar/forms` уровневая валидация), это
  не автоматизировано.
- **`MemberAccessExpr` не поддержан.** Условие вида `related.field` (проход через relation) не
  встречалось в `@@validate` моделей форм-плагина ни разу — попытка его сериализовать кидает
  понятную ошибку кодогена, а не тихо портит рантайм-поведение.

### `@@strict()` — реализован, но недоступен на `model`

Кодогенерация под `@@strict()` (`z.strictObject(...)` вместо `z.object(...)`) в плагине есть
(`ModelInfo.isStrict`), но **включить её на реальной модели нельзя**: стандартная библиотека
ZModel разрешает `@@strict()` только на `type`-определениях (`zenstack generate` останавливается
с «attribute "@@strict" can only be used on type definitions» при попытке поставить его на
`model`). Это не риск и не недоделка нашего плагина — ограничение самого языка ZModel, найденное
живым прогоном при верификации Фазы 2. Код оставлен на будущее, если ZenStack расширит область
действия атрибута.

## Автоматически исключаемые поля

- `id` — первичные ключи
- `createdAt`, `updatedAt` — системные поля
- Поля с атрибутом `@id`
- Поля с атрибутом `@relation` (relation поля)
- Поля, ссылающиеся на модели (например `info RecipeInfo?`)
- Поля с `@meta("form.exclude", true)`
- Поля с атрибутом `@omit` (скрыты из ORM-клиента целиком)
- Поля с атрибутом `@computed` (вычисляются сервером, не вводятся пользователем)

> **Примечание:** FK поля (`categoryId`, `userId`, etc.) не исключаются автоматически.
> Используйте `form.relation` для создания select-поля или `form.exclude` для исключения.

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

MCP сервер [`@letar/form-mcp`](../form-mcp/README.md) предоставляет AI-ассистентам доступ к документации всех `@meta("form.*", …)`-ключей через tool `get_directives`.

## Версия

Текущая версия — **3.0.0** (Фаза 3: `@meta("form.*", value)` как основной синтаксис). Полная
история — в [package.json](package.json) и [CHANGELOG.md](CHANGELOG.md).
