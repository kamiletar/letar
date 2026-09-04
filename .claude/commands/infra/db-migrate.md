---
description: Миграции схемы БД через ZenStack/Prisma — генерация, push/migrate и @meta("form.*", value) директивы
allowed-tools: Bash, Read, Grep, Glob
---

# DB Migrate - Миграции базы данных

Выполни изменения схемы базы данных через ZenStack/Prisma.

## Когда использовать

- Добавление новой модели
- Изменение полей существующей модели
- Добавление связей между моделями
- Изменение enum'ов

## Workflow

### 1. Редактирование схемы

```bash
# Открой файл схемы
apps/<app>/schema.zmodel
```

### 2. Генерация

```bash
# Генерация Prisma клиента + Zod схем + Form схем
nx zenstack:generate <app>
```

### 3. Применение изменений

**Development (push):**

```bash
nx db:push <app>
```

**Production (migrate):**

```bash
nx db:migrate <app>
# Введи имя миграции
```

### 4. Проверка

```bash
# Открыть Prisma Studio
nx db:studio <app>
```

## Примеры изменений

### Добавление модели с UI метаданными

```zmodel
model Product {
  id          String   @id @default(cuid())

  title       String @meta("form.title", "Название продукта") @meta("form.placeholder", "Введите название")

  // Объектный литерал в @meta ломает zenstack generate целиком (ObjectExpr не поддержан
  // upstream-генератором TS-схемы) — form.props только плоским dot-path, не объектом.
  price       Int @meta("form.title", "Цена") @meta("form.fieldType", "currency")
    @meta("form.props.min", 0) @meta("form.props.currency", "RUB")

  rating      Float    @default(0) @meta("form.title", "Рейтинг") @meta("form.fieldType", "rating")
    @meta("form.props.count", 5) @meta("form.props.allowHalf", true)

  isActive    Boolean  @default(true) @meta("form.title", "Активен") @meta("form.fieldType", "switch")

  tags        String[] @meta("form.title", "Теги") @meta("form.fieldType", "tags")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

> ⚠️ **Legacy-синтаксис** (`/// @form.title("...")` и т.д.) продолжает работать — плагин печатает
> deprecation-warning в консоль `nx zenstack:generate`, но сборка не ломается. Новый код пиши на
> `@meta`, не мигрируй существующий вручную — для этого есть кодмод
> `scripts/codemods/codemod-form-directives.mjs`.

### Добавление enum с метками

```zmodel
enum RecipeType {
  /// Сладкое
  SWEET
  /// Солёное
  SALTY
  /// Острое
  SPICY
}
```

### Поддерживаемые директивы (основной синтаксис — `@meta`, Фаза 3 zenstack-form-plugin v3.0.0)

| Ключ `@meta("form.<key>", …)` | Описание               | Пример                                                    | Legacy (deprecated)                          |
| ----------------------------- | ---------------------- | --------------------------------------------------------- | -------------------------------------------- |
| `form.title`                  | Заголовок поля (label) | `@meta("form.title", "Название")`                         | `/// @form.title("Название")`                |
| `form.placeholder`            | Placeholder            | `@meta("form.placeholder", "Введите...")`                 | `/// @form.placeholder("Введите...")`        |
| `form.description`            | Описание (helperText)  | `@meta("form.description", "Подсказка")`                  | `/// @form.description("Подсказка")`         |
| `form.fieldType`              | Тип UI компонента      | `@meta("form.fieldType", "tags")`                         | `/// @form.fieldType("tags")`                |
| `form.props.<dotpath>`        | Constraints + UI props | `@meta("form.props.min", 1) @meta("form.props.max", 100)` | `/// @form.props({ min: 1, max: 100 })`      |
| `form.relation.<dotpath>`     | Настройки relation     | `@meta("form.relation.labelField", "name")`               | `/// @form.relation({ labelField: "name" })` |
| `form.exclude`                | Исключить из формы     | `@meta("form.exclude", true)`                             | `/// @form.exclude`                          |

⚠️ `form.props`/`form.relation` — только плоский dot-path, не объект: `@meta(key, {...})` ломает
`zenstack generate` целиком (`Unsupported attribute arg value: ObjectExpr`).

### Типы полей (fieldType)

| Категория   | Типы                                                        |
| ----------- | ----------------------------------------------------------- |
| Текстовые   | `string`, `textarea`, `password`, `richText`, `editable`    |
| Числовые    | `number`, `slider`, `rating`, `currency`, `percentage`      |
| Дата/время  | `date`, `time`, `dateRange`, `duration`, `schedule`         |
| Булевые     | `checkbox`, `switch`                                        |
| Выбор       | `select`, `combobox`, `radioGroup`, `radioCard`, `tags`     |
| Специальные | `phone`, `address`, `pinInput`, `colorPicker`, `fileUpload` |

## Автоматически исключаемые поля

- `id` — первичные ключи
- `createdAt`, `updatedAt` — системные поля
- Поля с `@relation` — relation поля
- Поля с `@meta("form.exclude", true)`

> **Важно:** FK поля (`categoryId`) НЕ исключаются. Используй `form.relation` или `form.exclude`.

## Чеклист

- [ ] Схема валидна (нет ошибок синтаксиса)
- [ ] `@meta("form.*", value)` директивы добавлены для UI полей
- [ ] Enum'ы имеют `///` метки для значений
- [ ] Генерация прошла успешно
- [ ] БД обновлена (push/migrate)
- [ ] Prisma Studio показывает изменения

## Откат миграции

```bash
# Откат последней миграции (только dev)
npx prisma migrate reset --skip-seed
```

## Документация

- [database.md](/.claude/docs/database.md) — работа с БД
- [libs/forms/README.md](/libs/forms/README.md) — `@meta("form.*", value)` директивы
- [libs/zenstack-form-plugin/README.md](/libs/zenstack-form-plugin/README.md) — плагин генерации
