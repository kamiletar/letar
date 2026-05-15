# Zod .meta() — одна схема для валидации, UI и доступности

> **Уровень сложности:** Средний

**TL;DR:**

- В классическом подходе одно поле формы описано в 2-3 местах: Zod-схема, JSX-пропсы, HTML-атрибуты. Рассинхронизация — вопрос времени.
- Zod v4 `.meta()` позволяет хранить label, placeholder и helperText прямо в схеме валидации.
- Результат: 80 строк JSX → 8. Одна схема = единственный источник правды.

**Кому полезно:**

- Junior: поймёте, зачем нужен DRY в формах и как работает Zod `.meta()`
- Middle: увидите конкретное сравнение до/после с React Hook Form + Chakra UI
- Senior: разберёте механизм unwrapping Zod-типов и автоматического извлечения constraints

---

> Вторая статья из цикла «@letar/forms — от боли к декларативным формам». Как мы объединили правила валидации и UI-метаданные в одной Zod-схеме и почему это убивает дублирование.

<details>
<summary>Что такое Zod v4 и чем отличается от v3</summary>

**Zod** — библиотека валидации для TypeScript. Вы описываете схему данных — Zod проверяет входные данные и выводит TypeScript-типы автоматически.

**Zod v4** (выпущен в 2025) добавил несколько ключевых фич:

- **`.meta()`** — прикрепление произвольных метаданных к любому типу (то, о чём эта статья)
- **Улучшенная производительность** — парсинг в 2-7x быстрее v3
- **Новый JSON-совместимый формат ошибок**
- **`z.interface()`** — для рекурсивных типов

Миграция: `import { z } from 'zod/v4'` (v3 API доступен через `'zod/v3'`). Подробнее — [zod.dev](https://zod.dev).

</details>

---

## Проблема: три источника правды

В [прошлой статье](01-why-forms-hurt.md) мы показали классическую боль React-форм. Давайте присмотримся к одному конкретному полю — email:

```tsx
// 1. Zod-схема (валидация)
const schema = z.object({
  email: z.string().email('Некорректный email').max(255),
})

// 2. JSX (UI-метаданные)
<FormControl>
  <FormLabel>Email</FormLabel>
  <Input
    placeholder="user@example.com"
    type="email"
    maxLength={255}
  />
  <FormHelperText>Используется для входа</FormHelperText>
  <FormErrorMessage>{error}</FormErrorMessage>
</FormControl>
```

Видите проблему? Одно поле — и уже два файла знают про него разное:

| Что                      | Где живёт        | Кто обновляет        |
| ------------------------ | ---------------- | -------------------- |
| «Максимум 255 символов»  | Zod: `.max(255)` | Бэкенд-разработчик   |
| `maxLength={255}`        | JSX-пропс        | Фронтенд-разработчик |
| «Email»                  | `<FormLabel>`    | Дизайнер/фронтенд    |
| `type="email"`           | HTML-атрибут     | Фронтенд             |
| «Некорректный email»     | Zod-сообщение    | Бэкенд               |
| «user@example.com»       | placeholder      | Дизайнер             |
| «Используется для входа» | helperText       | Продакт/дизайнер     |

Семь фактов о поле, разбросанных по двум местам (а часто и по трём — если есть серверная валидация). Рассинхронизация — вопрос времени.

---

## Решение: Zod `.meta()` как единый источник

Zod v4 добавил метод `.meta()` — возможность прикрепить произвольные метаданные к любому типу. Мы используем это для хранения UI-информации прямо в схеме валидации:

```tsx
import { z } from 'zod/v4'

const UserSchema = z.object({
  email: z
    .string()
    .email('Некорректный email')
    .max(255)
    .meta({
      ui: {
        title: 'Email',
        placeholder: 'user@example.com',
        description: 'Используется для входа',
      },
    }),

  name: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(100)
    .meta({
      ui: {
        title: 'Имя',
        placeholder: 'Иван Иванов',
      },
    }),

  age: z
    .number()
    .min(18, 'Минимум 18 лет')
    .max(150)
    .meta({
      ui: {
        title: 'Возраст',
        description: 'Полных лет',
      },
    }),
})
```

Теперь **всё** в одном месте. Одна схема определяет:

- Тип данных (`string`, `number`)
- Правила валидации (`.email()`, `.min()`, `.max()`)
- Сообщения об ошибках
- Label, placeholder, helperText

А JSX остаётся чистым:

```tsx
<Form schema={UserSchema} initialValue={data} onSubmit={save}>
  <Form.Field.String name="email" />
  <Form.Field.String name="name" />
  <Form.Field.Number name="age" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

Пять строк JSX. Ноль дублирования.

---

## Как это работает под капотом

### Извлечение метаданных

Когда `<Form.Field.String name="email" />` рендерится, библиотека:

1. Получает Zod-схему из контекста формы
2. Находит поле по пути (`email`)
3. Извлекает `.meta()` через внутренний API Zod

```typescript
// Упрощённая версия нашего schema-meta.ts
function getFieldMeta(schema, path) {
  // Навигация по вложенным путям: "user.address.city"
  const parts = path.split('.')
  let current = schema

  for (const part of parts) {
    // Раскрываем обёртки: optional, nullable, default, effects, pipeline
    current = unwrapToBaseSchema(current)

    // Навигация в shape объекта
    if (current._zod?.def?.type === 'object') {
      current = current._zod.def.shape[part]
    } // Или в element массива
    else if (current._zod?.def?.type === 'array') {
      current = current._zod.def.element
    }
  }

  // Извлекаем метаданные
  const meta = typeof current?.meta === 'function' ? current.meta() : undefined
  return meta?.ui
}
```

Ключевой момент — **unwrapping**. В Zod v4 одно поле может быть обёрнуто в несколько слоёв:

```
z.string().email().optional().default('').pipe(z.string().trim())
```

Это `ZodPipe(ZodDefault(ZodOptional(ZodString)))` — четыре вложенных типа. Наш `unwrapToBaseSchema` проходит сквозь все слои, чтобы добраться до метаданных.

### Автоматические constraints

Помимо `.meta()`, мы извлекаем ограничения из самой Zod-схемы:

```typescript
function extractConstraints(schema) {
  const checks = schema._zod?.def?.checks ?? []
  const constraints = {}

  for (const check of checks) {
    switch (check.kind) {
      case 'min':
        constraints.minLength = check.value
        break
      case 'max':
        constraints.maxLength = check.value
        break
      case 'email':
        constraints.inputType = 'email'
        break
      case 'url':
        constraints.inputType = 'url'
        break
      case 'regex':
        constraints.pattern = check.value.source
        break
    }
  }

  return constraints
}
```

Это значит:

```tsx
z.string().min(2).max(100)
// → автоматически: minLength={2} maxLength={100}

z.string().email()
// → автоматически: type="email"

z.string().url()
// → автоматически: type="url"

z.number().min(0).max(10)
// → автоматически: min={0} max={10}
```

Вам не нужно прописывать HTML-атрибуты вручную. DRY в чистом виде.

---

## Приоритет: props > schema

Иногда нужно переопределить то, что в схеме. Приоритет всегда в пользу явного пропса:

```tsx
const Schema = z.object({
  title: z.string().meta({
    ui: { title: 'Название', placeholder: 'Введите...' },
  }),
})

// Используем метаданные из схемы
<Form.Field.String name="title" />
// → label="Название", placeholder="Введите..."

// Переопределяем
<Form.Field.String name="title" label="Заголовок статьи" placeholder="О чём пишем?" />
// → label="Заголовок статьи", placeholder="О чём пишем?"
```

Это важно для кейсов, когда одна схема используется в разных контекстах (создание vs редактирование).

---

## Продвинутые метаданные

`.meta({ ui })` поддерживает больше, чем title/placeholder:

```tsx
const ProductSchema = z.object({
  name: z.string().meta({
    ui: {
      title: 'Название продукта',
      placeholder: 'Введите название',
      description: 'Будет отображаться в каталоге',
    },
  }),

  price: z
    .number()
    .min(0)
    .meta({
      ui: {
        title: 'Цена',
        fieldType: 'currency', // Какой компонент использовать
        fieldProps: { currency: 'RUB' }, // Пропсы компонента
      },
    }),

  category: z.enum(['clothes', 'shoes', 'accessories']).meta({
    ui: {
      title: 'Категория',
      fieldType: 'radioCard', // Карточки вместо dropdown
      fieldProps: {
        options: [
          { value: 'clothes', label: 'Одежда', icon: '👕' },
          { value: 'shoes', label: 'Обувь', icon: '👟' },
          { value: 'accessories', label: 'Аксессуары', icon: '💍' },
        ],
      },
    },
  }),
})
```

`fieldType` определяет, какой компонент рендерить. `fieldProps` передаёт ему кастомные пропсы. Вся конфигурация — в схеме.

### Автоматический HTML autocomplete

Есть ещё один тип метаданных, который большинство библиотек игнорирует — атрибут `autocomplete`. Мобильные браузеры и менеджеры паролей используют его для автозаполнения: имя, email, телефон, адрес, данные карты. По стандарту WCAG 1.3.5, `autocomplete` обязателен для accessibility.

`@letar/forms` проставляет его **автоматически** — по имени поля:

| Имя поля     | autocomplete       | Что подставит браузер |
| ------------ | ------------------ | --------------------- |
| `email`      | `email`            | Email из профиля      |
| `firstName`  | `given-name`       | Имя                   |
| `lastName`   | `family-name`      | Фамилия               |
| `phone`      | `tel`              | Телефон               |
| `password`   | `current-password` | Пароль из менеджера   |
| `address`    | `street-address`   | Адрес                 |
| `city`       | `address-level2`   | Город                 |
| `zip`        | `postal-code`      | Почтовый индекс       |
| `cardNumber` | `cc-number`        | Номер карты           |
| `cardExpiry` | `cc-exp`           | Срок действия         |

Внутри библиотеки — 40+ таких маппингов. Достаточно назвать поле `email` — и `autocomplete="email"` появится автоматически.

Если автоматика не подходит, переопределение через `.meta()`:

```tsx
z.string().meta({ autocomplete: 'shipping street-address' })
```

Приоритет: явный проп на поле → `.meta({ autocomplete })` → автодетекция по имени.

---

## Вложенные объекты и массивы

Метаданные работают на любой глубине вложенности:

```tsx
const OrderSchema = z.object({
  customer: z.object({
    name: z.string().meta({ ui: { title: 'Имя клиента' } }),
    phone: z.string().meta({
      ui: { title: 'Телефон', fieldType: 'phone' },
    }),
  }),

  items: z.array(
    z.object({
      product: z.string().meta({ ui: { title: 'Товар' } }),
      quantity: z.number().min(1).meta({ ui: { title: 'Кол-во' } }),
    })
  ),
})

// JSX: чистая вёрстка
<Form schema={OrderSchema} initialValue={data} onSubmit={save}>
  <Form.Group name="customer">
    <Form.Field.String name="name" />
    <Form.Field.Phone name="phone" />
  </Form.Group>

  <Form.Group.List name="items">
    <Form.Field.String name="product" />
    <Form.Field.Number name="quantity" />
    <Form.Group.List.Button.Add>+ Добавить товар</Form.Group.List.Button.Add>
  </Form.Group.List>

  <Form.Button.Submit />
</Form>
```

`getFieldMeta(schema, 'customer.phone')` — библиотека автоматически навигирует сквозь вложенные объекты и массивы.

---

## Сравнение: до и после

### До (React Hook Form + Zod + Chakra UI)

```tsx
// schema.ts
const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+7\d{10}$/),
  age: z.number().min(18).max(150),
  bio: z.string().max(500).optional(),
})

// form.tsx — 80+ строк
<form onSubmit={handleSubmit(onSubmit)}>
  <FormControl isInvalid={!!errors.name}>
    <FormLabel>Имя</FormLabel>
    <Input placeholder="Иван Иванов" maxLength={100} {...register('name')} />
    <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
  </FormControl>

  <FormControl isInvalid={!!errors.email}>
    <FormLabel>Email</FormLabel>
    <Input placeholder="user@example.com" type="email" {...register('email')} />
    <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
  </FormControl>

  <FormControl isInvalid={!!errors.phone}>
    <FormLabel>Телефон</FormLabel>
    <Input placeholder="+7 (999) 123-45-67" type="tel" {...register('phone')} />
    <FormHelperText>Формат: +7XXXXXXXXXX</FormHelperText>
    <FormErrorMessage>{errors.phone?.message}</FormErrorMessage>
  </FormControl>

  <FormControl isInvalid={!!errors.age}>
    <FormLabel>Возраст</FormLabel>
    <NumberInput min={18} max={150}>
      <NumberInputField {...register('age', { valueAsNumber: true })} />
    </NumberInput>
    <FormErrorMessage>{errors.age?.message}</FormErrorMessage>
  </FormControl>

  <FormControl isInvalid={!!errors.bio}>
    <FormLabel>О себе</FormLabel>
    <Textarea placeholder="Расскажите о себе..." maxLength={500} {...register('bio')} />
    <FormHelperText>До 500 символов</FormHelperText>
    <FormErrorMessage>{errors.bio?.message}</FormErrorMessage>
  </FormControl>

  <Button type="submit">Сохранить</Button>
</form>
```

~50 строк JSX, дублирование label/placeholder/maxLength/type.

### После (@letar/forms)

```tsx
const ProfileSchema = z.object({
  name: z.string().min(2).max(100).meta({
    ui: { title: 'Имя', placeholder: 'Иван Иванов' },
  }),
  email: z.string().email().meta({
    ui: { title: 'Email', placeholder: 'user@example.com' },
  }),
  phone: z.string().regex(/^\+7\d{10}$/).meta({
    ui: { title: 'Телефон', fieldType: 'phone', description: 'Формат: +7XXXXXXXXXX' },
  }),
  age: z.number().min(18).max(150).meta({
    ui: { title: 'Возраст' },
  }),
  bio: z.string().max(500).optional().meta({
    ui: { title: 'О себе', placeholder: 'Расскажите о себе...', description: 'До 500 символов' },
  }),
})

<Form schema={ProfileSchema} initialValue={data} onSubmit={save}>
  <Form.Field.String name="name" />
  <Form.Field.String name="email" />
  <Form.Field.Phone name="phone" />
  <Form.Field.Number name="age" />
  <Form.Field.Textarea name="bio" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

8 строк JSX. Ноль дублирования. `maxLength`, `type`, `min/max` — из Zod автоматически.

Или совсем коротко:

```tsx
<Form.FromSchema schema={ProfileSchema} initialValue={data} onSubmit={save} />
```

Одна строка.

---

## Итоги

| Аспект            | Классический подход | @letar/forms                 |
| ----------------- | ------------------- | ---------------------------- |
| Label             | В JSX               | В Zod `.meta()`              |
| Placeholder       | В JSX               | В Zod `.meta()`              |
| maxLength/min/max | В JSX вручную       | Из Zod автоматически         |
| type="email"      | В JSX вручную       | Из `z.email()` автоматически |
| Ошибки            | В JSX вручную       | Автоматически                |
| Источников правды | 2-3                 | 1                            |

Ключевая идея: **схема — единственный источник правды**. JSX содержит только вёрстку и имена полей.

---

## Попробовать

<details>
<summary>Установка</summary>

```bash
bun add @letar/forms
```

```tsx
import { z } from 'zod/v4'

const Schema = z.object({
  email: z.email().meta({ ui: { title: 'Email', placeholder: 'user@example.com' } }),
  name: z.string().min(2).meta({ ui: { title: 'Имя' } }),
})

<Form schema={Schema} initialValue={{ email: '', name: '' }} onSubmit={save}>
  <Form.Field.String name="email" />
  <Form.Field.String name="name" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

</details>

- [Документация](https://forms.letar.best)
- [Живой пример: validation](https://forms-example.letar.best/examples/validation)
- [Живой пример: constraints](https://forms-example.letar.best/examples/constraints)
- [GitHub](https://github.com/kamiletar/letar-forms)
- [MCP для AI](https://www.npmjs.com/package/@letar/form-mcp)

---

**Навигация по серии**
← Предыдущая: [Формы в React: почему больно](01-why-forms-hurt.md)
→ Следующая: [От первой формы до архитектуры: Compound Components](03-compound-components.md)

---

**Используете ли вы Zod v4 .meta() в своих проектах? Для валидации, генерации форм или чего-то ещё?**
