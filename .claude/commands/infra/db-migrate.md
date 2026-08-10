---
description: Миграции схемы БД через ZenStack/Prisma — генерация, push/migrate и @form.* директивы
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

  /// @form.title("Название продукта")
  /// @form.placeholder("Введите название")
  title       String

  /// @form.title("Цена")
  /// @form.fieldType("currency")
  /// @form.props({ min: 0, currency: "RUB" })
  price       Int

  /// @form.title("Рейтинг")
  /// @form.fieldType("rating")
  /// @form.props({ count: 5, allowHalf: true })
  rating      Float    @default(0)

  /// @form.title("Активен")
  /// @form.fieldType("switch")
  isActive    Boolean  @default(true)

  /// @form.title("Теги")
  /// @form.fieldType("tags")
  tags        String[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

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

### Поддерживаемые @form.\* директивы

| Директива                  | Описание               | Пример                                       |
| -------------------------- | ---------------------- | -------------------------------------------- |
| `@form.title("...")`       | Заголовок поля (label) | `/// @form.title("Название")`                |
| `@form.placeholder("...")` | Placeholder            | `/// @form.placeholder("Введите...")`        |
| `@form.description("...")` | Описание (helperText)  | `/// @form.description("Подсказка")`         |
| `@form.fieldType("...")`   | Тип UI компонента      | `/// @form.fieldType("tags")`                |
| `@form.props({...})`       | Constraints + UI props | `/// @form.props({ min: 1, max: 100 })`      |
| `@form.relation({...})`    | Настройки relation     | `/// @form.relation({ labelField: "name" })` |
| `@form.exclude`            | Исключить из формы     | `/// @form.exclude`                          |

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
- Поля с `@form.exclude`

> **Важно:** FK поля (`categoryId`) НЕ исключаются. Используй `@form.relation` или `@form.exclude`.

## Чеклист

- [ ] Схема валидна (нет ошибок синтаксиса)
- [ ] `/// @form.*` директивы добавлены для UI полей
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
- [libs/forms/README.md](/libs/forms/README.md) — @form.\* директивы
- [libs/zenstack-form-plugin/README.md](/libs/zenstack-form-plugin/README.md) — плагин генерации
