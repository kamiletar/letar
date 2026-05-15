# FromSchema: генерируем React-форму из одной строки Zod-схемы

> **Уровень сложности:** Средний

**TL;DR:**

- `Form.FromSchema` генерирует полную форму из Zod-схемы за одну строку — маппинг типов на компоненты автоматический
- Четыре уровня контроля: FromTemplate -> FromSchema -> AutoFields -> Field.\* — начинаете с автогенерации, детализируете по мере необходимости
- Для CRUD-форм, прототипирования и админ-панелей FromSchema экономит тысячи строк кода

**Кому полезно:**

- Junior: научиться создавать формы в одну строку без ручной вёрстки каждого поля
- Middle: освоить комбинирование AutoFields с ручными полями и паттерны FromTemplate/Builder/ConversationalMode
- Senior: оценить архитектуру маппера Zod type -> компонент и стратегию четырёх уровней контроля

---

> Седьмая статья из цикла «@letar/forms — от боли к декларативным формам». Как `Form.FromSchema` автоматически генерирует полную форму из Zod-схемы — и когда этого достаточно.

---

## Идея: а что, если ноль JSX?

В предыдущих статьях мы показали, как Compound Components (`<Form.Field.String>`) делают JSX чистым. Но что если и этот JSX убрать?

```tsx
// Вся форма — одна строка
<Form.FromSchema schema={UserSchema} initialValue={data} onSubmit={save} />
```

Библиотека сама:

1. Обходит Zod-схему
2. Определяет тип каждого поля
3. Подбирает компонент (`String`, `Number`, `Select`, ...)
4. Читает `.meta({ ui })` для label, placeholder, описания
5. Рендерит форму с кнопкой Submit

---

## Как это работает

### Шаг 1: обход схемы

```typescript
// Упрощённая версия schema-traversal.ts
function enumerateFields(schema) {
  const shape = unwrapToBaseSchema(schema)._zod?.def?.shape
  if (!shape) return []

  return Object.entries(shape).map(([name, fieldSchema]) => ({
    name,
    zodType: getZodType(fieldSchema), // string, number, boolean, ...
    required: isRequired(fieldSchema),
    constraints: extractConstraints(fieldSchema),
    meta: getMeta(fieldSchema),
  }))
}
```

Для схемы:

```typescript
const UserSchema = z.object({
  name: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Имя' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email' } }),
  role: z.enum(['admin', 'user']).meta({ ui: { title: 'Роль' } }),
  age: z
    .number()
    .min(18)
    .meta({ ui: { title: 'Возраст' } }),
  bio: z
    .string()
    .max(500)
    .optional()
    .meta({ ui: { title: 'О себе' } }),
})
```

Получаем:

```
[
  { name: 'name',  zodType: 'string',  required: true,  meta: { title: 'Имя' } }
  { name: 'email', zodType: 'string',  required: true,  meta: { title: 'Email' }, constraints: { inputType: 'email' } }
  { name: 'role',  zodType: 'enum',    required: true,  meta: { title: 'Роль' }, enumValues: ['admin', 'user'] }
  { name: 'age',   zodType: 'number',  required: true,  meta: { title: 'Возраст' } }
  { name: 'bio',   zodType: 'string',  required: false, meta: { title: 'О себе' }, constraints: { maxLength: 500 } }
]
```

### Шаг 2: маппинг типов на компоненты

```
string               → FieldString
string + email()     → FieldString (type="email")
string + max > 200   → FieldTextarea
number               → FieldNumber
boolean              → FieldCheckbox
date                 → FieldDate
enum                 → FieldNativeSelect
array(string)        → FieldTags

// Переопределение через fieldType в meta:
fieldType: 'currency'    → FieldCurrency
fieldType: 'richText'    → FieldRichText
fieldType: 'phone'       → FieldPhone
```

### Шаг 3: рендер

```tsx
function FormFromSchema({ schema, initialValue, onSubmit, submitLabel, exclude }) {
  return (
    <Form schema={schema} initialValue={initialValue} onSubmit={onSubmit}>
      <VStack align="stretch" gap={4}>
        <FormAutoFields exclude={exclude} />
        <HStack justify="flex-end">
          <Form.Button.Submit>{submitLabel ?? 'Сохранить'}</Form.Button.Submit>
        </HStack>
      </VStack>
    </Form>
  )
}
```

`FormAutoFields` — компонент, который обходит схему и рендерит каждое поле через маппер.

---

## Кастомизация без отказа от автогенерации

### Исключение полей

```tsx
<Form.FromSchema
  schema={ProductSchema}
  initialValue={data}
  onSubmit={save}
  exclude={['id', 'createdAt', 'updatedAt']} // Скрыть служебные поля
/>
```

### AutoFields + ручные поля

Когда нужен контроль над частью формы:

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  {/* Автоматически все поля, кроме description */}
  <Form.AutoFields exclude={['description']} />

  {/* description — вручную, с кастомной обёрткой */}
  <Box p={4} bg="gray.50" borderRadius="md">
    <Form.Field.RichText name="description" />
  </Box>

  <Form.Button.Submit />
</Form>
```

`AutoFields` генерирует все поля автоматически, а `description` вы контролируете сами. Лучшее из двух миров.

### include: только нужные поля

```tsx
<Form schema={UserSchema} initialValue={data} onSubmit={save}>
  {/* Только name и email */}
  <Form.AutoFields include={['name', 'email']} />
  <Form.Button.Submit />
</Form>
```

---

## Четыре уровня контроля

```
Уровень 1: FromSchema      — ноль JSX, всё автоматически
           ↓ нужна кастомная вёрстка?
Уровень 2: AutoFields      — автогенерация + ручные поля
           ↓ нужен полный контроль?
Уровень 3: Form.Field.*    — Compound Components
           ↓ нужна императивная логика?
Уровень 4: useAppForm      — хук, полный доступ к TanStack Form
```

Начинаете с FromSchema. Когда нужно больше контроля — спускаетесь. Не нужно переписывать — уровни совместимы.

---

## Когда FromSchema — идеальный выбор

### CRUD-формы

Модель Product с 10 полями. Нужна форма создания и редактирования:

```tsx
// Создание
<Form.FromSchema
  schema={ProductCreateSchema}
  initialValue={emptyProduct}
  onSubmit={createProduct}
  submitLabel="Создать"
/>

// Редактирование
<Form.FromSchema
  schema={ProductUpdateSchema}
  initialValue={product}
  onSubmit={updateProduct}
  submitLabel="Сохранить"
  exclude={['id']}
/>
```

Две формы — две строки.

### Прототипирование

Быстро набросать форму, пока дизайн не готов:

```tsx
const schema = z.object({
  title: z.string().meta({ ui: { title: 'Название' } }),
  price: z.number().meta({ ui: { title: 'Цена', fieldType: 'currency' } }),
  category: z.enum(['A', 'B', 'C']).meta({ ui: { title: 'Категория' } }),
})

// Форма готова к тестированию
<Form.FromSchema schema={schema} initialValue={{}} onSubmit={console.log} />
```

### Админ-панели

50 моделей × 2 формы (create + edit) = 100 форм. С FromSchema — 100 строк вместо 5000+.

---

## Ещё больше автоматизации

### Form.FromTemplate — готовые шаблоны

10 шаблонов для типичных форм. Ноль конфигурации:

```tsx
// Контактная форма
<Form.FromTemplate template="contact" onSubmit={handleContact} />

// Логин
<Form.FromTemplate template="login" onSubmit={handleLogin} />

// Регистрация
<Form.FromTemplate template="register" onSubmit={handleRegister} />
```

Доступные шаблоны: `contact`, `login`, `register`, `feedback`, `survey`, `address`, `payment`, `profile`, `newsletter`, `support`.

Каждый шаблон — готовая Zod-схема + подобранные компоненты + валидация. Можно кастомизировать через `overrides`:

```tsx
<Form.FromTemplate template="contact" overrides={{ fields: { phone: { required: true } } }} onSubmit={handleSubmit} />
```

### Form.Builder — JSON-конфигурация

Для динамических форм (CMS, конструкторы, no-code) — JSON-driven подход. Менеджер или продакт описывает форму в JSON, разработчик не трогает JSX:

```tsx
import { FormBuilder } from '@letar/forms'

const config = {
  sections: [
    {
      title: 'Контактные данные',
      fields: [
        { name: 'name', type: 'string', label: 'Имя' },
        { name: 'email', type: 'string', label: 'Email' },
        { name: 'phone', type: 'phone', label: 'Телефон' },
      ],
    },
    {
      title: 'Заказ',
      fields: [
        { name: 'price', type: 'currency', label: 'Цена' },
        { name: 'category', type: 'select', label: 'Категория', options: categories },
        { name: 'quantity', type: 'number', label: 'Количество' },
      ],
    },
  ],
}

<FormBuilder
  config={config}
  initialValue={{ name: '', email: '', phone: '' }}
  onSubmit={save}
/>
```

Поддерживаемые типы полей: `string`, `textarea`, `number`, `currency`, `percentage`, `slider`, `rating`, `checkbox`, `switch`, `select`, `date`, `password`, `phone`, `auto`. Тип `auto` определяет компонент из Zod-схемы автоматически. JSON-конфиг можно хранить в БД и подгружать через API — форма строится без единой строчки JSX.

### ConversationalMode — Typeform-style

Одно поле за раз. Идеально для опросов, NPS и анкет:

```tsx
import { ConversationalMode } from '@letar/forms'

<Form
  schema={SurveySchema}
  initialValue={{ name: '', satisfaction: 0, feedback: '' }}
  onSubmit={submitSurvey}
>
  <ConversationalMode
    showProgress
    showQuestionNumber
    completedScreen={<Text>Спасибо за ответы!</Text>}
  >
    <Form.Field.String name="name" label="Как вас зовут?" />
    <Form.Field.Rating name="satisfaction" label="Оцените сервис" />
    <Form.Field.Textarea name="feedback" label="Что можно улучшить?" />
  </ConversationalMode>
</Form>
```

`ConversationalMode` оборачивает обычные `Form.Field.*` — каждый дочерний элемент становится отдельным шагом. Анимация fade-in-up, навигация Enter/Alt+стрелки, прогресс-бар и нумерация вопросов. Работает с любыми полями из библиотеки.

### Иерархия уровней контроля

```
Макс. автоматизация → Макс. контроль

FromTemplate → FromSchema → AutoFields → Builder → ConversationalMode → Field.*
   ↑              ↑            ↑           ↑              ↑                ↑
 Шаблоны     Вся форма    Часть полей   JSON-driven   По одному       Ручной JSX
```

---

## Когда что использовать

| Сценарий                | Инструмент                      |
| ----------------------- | ------------------------------- |
| Типовая форма           | `FromTemplate`                  |
| Линейная форма          | `FromSchema`                    |
| Частичная автогенерация | `AutoFields`                    |
| CMS / динамические      | `Builder`                       |
| Опросники / анкеты      | `ConversationalMode`            |
| Сложный layout          | `Field.*` (Compound Components) |

---

## Когда FromSchema НЕ подходит

- **Сложная вёрстка** — двухколоночный layout, табы, аккордеоны → используйте Compound Components
- **Мультистеп** — FromSchema не поддерживает Steps → вручную
- **Условный рендеринг** — When не работает внутри AutoFields → вручную
- **Нестандартный UX** — кастомные анимации, inline-editing → вручную

Правило: если форма «линейная» (поля идут сверху вниз) — FromSchema. Если сложный layout — Compound Components.

---

## Итоги

| Что                     | Как                                      |
| ----------------------- | ---------------------------------------- |
| Полная автогенерация    | `<Form.FromSchema schema={S} ... />`     |
| Частичная автогенерация | `<Form.AutoFields exclude={[...]} />`    |
| Готовые шаблоны         | `<Form.FromTemplate template="contact">` |
| JSON-конфигурация       | `<Form.Builder config={...} />`          |
| Typeform-style          | `<ConversationalMode>` внутри `<Form>`   |
| Исключение полей        | `exclude={['id', 'createdAt']}`          |
| Включение полей         | `include={['name', 'email']}`            |
| Маппинг типов           | Автоматический (Zod type → компонент)    |
| Переопределение         | `fieldType` в `.meta({ ui })`            |

---

## Попробовать

- **AutoFields:** [forms-example.letar.best/examples/auto-fields](https://forms-example.letar.best/examples/auto-fields)
- **Продвинутое:** [forms-example.letar.best/examples/auto-fields-advanced](https://forms-example.letar.best/examples/auto-fields-advanced)
- **Исходный код:** [auto-fields](https://github.com/kamiletar/letar-forms-example/blob/main/src/app/examples/auto-fields/page.tsx) | [auto-fields-advanced](https://github.com/kamiletar/letar-forms-example/blob/main/src/app/examples/auto-fields-advanced/page.tsx)
- **Клонировать:** `git clone https://github.com/kamiletar/letar-forms-example && cd letar-forms-example && npm install && npm run dev`

В следующей статье — full-stack pipeline: от `schema.zmodel` (база данных) через ZenStack до готовой формы за 5 минут (подробнее — в [статье 8: ZenStack pipeline](08-zenstack-pipeline.md)).

---

_Это седьмая статья из цикла «@letar/forms — от боли к декларативным формам». [Предыдущая: Массивы и группы](06-arrays-groups.md) | [Следующая: ZenStack pipeline](08-zenstack-pipeline.md)._
