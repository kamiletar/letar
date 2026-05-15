# От первой формы до архитектуры: Compound Components, Context и createForm()

> **Уровень сложности:** Средний

**TL;DR:**

- Compound Components (`<Form.Field.String>`) дают полный контроль над вёрсткой при типобезопасности на уровне TypeScript.
- JSON-конфиги (react-jsonschema-form) компактнее, но кастомизация — боль.
- `createForm()` позволяет расширить библиотеку app-specific полями через lazy-loading.
- 4 уровня контроля: FromSchema → AutoFields → Form.Field.\* → useAppForm.

**Кому полезно:**

- Junior: поймёте разницу между JSON-конфигом и Compound Components
- Middle: увидите, как устроены Context API и namespace-паттерн через Object.assign
- Senior: оцените архитектуру createForm() с lazy-loading и tree-shaking

<details>
<summary>Что такое Compound Components (если не знакомы)</summary>

**Compound Components** — паттерн React, при котором группа компонентов работает вместе через общий Context. Родитель хранит состояние, дети его используют. Классический пример — `<select>` + `<option>` или `<Tabs>` + `<Tab>` + `<TabPanel>`.

В @letar/forms: `<Form>` (хранит состояние) → `<Form.Field.String>` (поле ввода, получает контекст) → `<Form.Button.Submit>` (кнопка, знает про isSubmitting).

</details>

---

> Третья статья из цикла «@letar/forms — от боли к декларативным формам». Почему мы выбрали `<Form.Field.String>` вместо JSON-конфигов, как устроен `createForm()` и что даёт паттерн Compound Components.

---

## Два пути: конфиг или компоненты

Когда вы строите библиотеку форм, первый архитектурный вопрос — как пользователь будет описывать форму?

### Путь 1: JSON-конфиг (react-jsonschema-form)

```tsx
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Имя' },
    email: { type: 'string', format: 'email', title: 'Email' },
    role: { type: 'string', enum: ['admin', 'user'], title: 'Роль' },
  },
}

const uiSchema = {
  email: { 'ui:placeholder': 'user@example.com' },
  role: { 'ui:widget': 'radio' },
}

<JsonSchemaForm schema={schema} uiSchema={uiSchema} onSubmit={save} />
```

**Плюсы:** Компактно, сериализуемо, можно генерировать на сервере.
**Минусы:**

- Кастомная вёрстка — боль. Хотите `<HStack>` вокруг двух полей? Нужен кастомный template
- Нет автокомплита в IDE. `'ui:widget': 'raido'` — опечатка, которую вы найдёте в рантайме
- Два объекта (schema + uiSchema) вместо одного источника
- Расширяемость через строковые ключи (`'ui:widget': 'myCustomWidget'`)

### Путь 2: Compound Components (@letar/forms)

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <HStack>
    <Form.Field.String name="name" />
    <Form.Field.String name="email" />
  </HStack>
  <Form.Field.RadioGroup name="role" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

**Плюсы:**

- Полный контроль над вёрсткой — это обычный JSX
- TypeScript автокомплит на всём: `name`, пропсы компонента, тип значения
- Один импорт — `Form` содержит все вложенные компоненты
- Кастомизация — стандартными React-средствами (пропсы, обёртки, children)

**Минусы:** Не сериализуемо (но для этого есть `FromSchema`).

Мы выбрали второй путь. Вот почему.

---

## Почему Compound Components

### 1. Вёрстка — это JSX

Форма — это не только набор полей. Это layout:

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <VStack gap={6}>
    {/* Две колонки */}
    <HStack gap={4}>
      <Form.Field.String name="firstName" />
      <Form.Field.String name="lastName" />
    </HStack>

    {/* Полная ширина */}
    <Form.Field.String name="email" />

    {/* Разделитель */}
    <Separator />
    <Heading size="sm">Дополнительно</Heading>

    {/* Условное отображение */}
    <Form.When field="role" is="company">
      <Form.Field.String name="companyName" />
      <Form.Field.String name="inn" />
    </Form.When>

    <Form.Button.Submit>Сохранить</Form.Button.Submit>
  </VStack>
</Form>
```

С JSON-конфигом это потребовало бы отдельного DSL для описания layout. У нас вместо DSL — React.

### 2. TypeScript из коробки

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Field.String name="titel" />
  // ^^^^^ // TS Error: Type '"titel"' is not assignable to type '"title" | "email" | ...'
</Form>
```

Опечатка в имени поля — ошибка компиляции. Не рантайм, не тест — редактор подчеркнёт красным. С JSON-конфигом вы бы узнали об этом только при рендере.

### 3. Один импорт

```tsx
import { Form } from '@letar/forms'

// Всё доступно через точку:
Form.Field.String
Form.Field.Number
Form.Field.Select
Form.Field.Date
Form.Field.Phone
Form.Field.Currency
Form.Field.RichText
// ... ещё 42 поля

Form.Group
Form.Group.List
Form.Group.List.Button.Add
Form.Group.List.Button.Remove

Form.Steps
Form.Steps.Step
Form.Steps.Navigation

Form.When
Form.Errors
Form.DebugValues
Form.OfflineIndicator

Form.Button.Submit
Form.Button.Reset
```

Не нужно импортировать 20 компонентов. Один `Form` — и точка-нотация делает всё discoverable.

---

## Как устроено внутри

### Object.assign — ключ к вложенным компонентам

```typescript
// Упрощённая версия
import { FieldNumber } from './fields/field-number'
import { FieldString } from './fields/field-string'
import { FormRoot } from './form-root'
// ... ещё 48 полей
import { ButtonReset, ButtonSubmit } from './form-buttons'
import { FormGroup, FormGroupList } from './form-group'
import { FormSteps } from './form-steps'

const FormField = {
  String: FieldString,
  Number: FieldNumber,
  Select: FieldSelect,
  Date: FieldDate,
  Phone: FieldPhone,
  CreditCard: FieldCreditCard,
  TableEditor: FieldTableEditor,
  DataGrid: FieldDataGrid,
  Hidden: FieldHidden,
  Calculated: FieldCalculated,
  // ... все 50+ полей
}

const FormButton = {
  Submit: ButtonSubmit,
  Reset: ButtonReset,
}

export const Form = Object.assign(FormRoot, {
  Field: FormField,
  Group: Object.assign(FormGroup, {
    List: Object.assign(FormGroupList, {
      Button: {
        Add: FormGroupListButtonAdd,
        Remove: FormGroupListButtonRemove,
      },
      DragHandle: FormGroupListDragHandle,
    }),
  }),
  Steps: Object.assign(FormSteps, {
    Step: FormStepsStep,
    Indicator: FormStepsIndicator,
    Navigation: FormStepsNavigation,
    CompletedContent: FormStepsCompleted,
  }),
  When: FormWhen,
  Watch: FormWatch, // Отслеживание изменений полей
  Errors: FormErrors,
  Divider: FormDivider, // Разделитель секций
  InfoBlock: FormInfoBlock, // Информационный блок
  DirtyGuard: FormDirtyGuard, // Предупреждение о несохранённых данных
  Button: FormButton,
  FromSchema: FormFromSchema,
  FromTemplate: FormFromTemplate, // 10 готовых шаблонов
  AutoFields: FormAutoFields,
  Builder: FormBuilder, // JSON form builder
  Captcha: FormCaptcha, // CAPTCHA (Turnstile/reCAPTCHA/hCaptcha)
  Document: FormDocument, // Российские документы (INN, KPP, OGRN, ...)
  DebugValues: FormDebugValues,
  OfflineIndicator: FormOfflineIndicator,
  SyncStatus: FormSyncStatus,
})
```

`Object.assign` превращает функцию-компонент в объект с вложенными свойствами. TypeScript видит и компонент, и его «дочерние» компоненты через точку.

### Context API: как поля знают о форме

Когда вы пишете `<Form.Field.String name="email" />`, компонент String не получает форму через пропсы. Он берёт её из контекста:

```
<Form>                    ← FormContext.Provider (schema, form instance)
  <Form.Group name="user">  ← GroupContext.Provider (prefix: "user")
    <Form.Field.String name="email" />  ← читает FormContext + GroupContext
    // Реальный путь: "user.email"
  </Form.Group>
</Form>
```

Три уровня контекста:

1. **FormContext** — инстанс TanStack Form, Zod-схема, конфиг
2. **GroupContext** — префикс пути (для вложенных объектов и массивов)
3. **FieldContext** — конкретное поле, его состояние, ошибки

Это позволяет компонентам быть «умными» без явной передачи данных.

### Controlled State: live preview и внешний контроль

Контекст позволяет не только полям читать форму, но и внешним компонентам подписываться на её состояние:

```tsx
import { useTypedFormSubscribe } from '@letar/forms'

function ProductPreview() {
  const { value } = useTypedFormSubscribe(['name', 'price', 'description'])

  return (
    <Card>
      <Heading>{value.name || 'Без названия'}</Heading>
      <Text>{value.price ? `${value.price} ₽` : ''}</Text>
      <Text>{value.description}</Text>
    </Card>
  )
} // Использование: preview обновляется при каждом изменении полей

<Form schema={ProductSchema} initialValue={data} onSubmit={save}>
  <HStack align="start">
    <VStack flex={1}>
      <Form.Field.String name="name" />
      <Form.Field.Currency name="price" />
      <Form.Field.Textarea name="description" />
    </VStack>
    <ProductPreview /> {/* Живой превью справа */}
  </HStack>
  <Form.Button.Submit />
</Form>
```

`useTypedFormSubscribe` принимает массив имён полей и перерисовывает компонент только при их изменении. Подробнее — в [документации Controlled State](https://forms.letar.best/docs/guides/controlled-state).

---

## createForm() — фабрика для расширения

Базовый `Form` покрывает 50+ полей. Но что, если вашему приложению нужны кастомные?

```typescript
import { createDaDataProvider, createForm } from '@letar/forms'
import { BrandCombobox } from './selects/BrandCombobox'
import { CategorySelect } from './selects/CategorySelect'

export const AppForm = createForm({
  // Кастомные поля
  extraFields: {
    DataTable: MyDataTableField,
  },

  // Кастомные select-компоненты
  extraSelects: {
    Category: CategorySelect,
  },

  // Lazy-loaded combobox (грузится только при рендере)
  lazyComboboxes: {
    Brand: () => import('./selects/BrandCombobox').then((m) => m.BrandCombobox),
  },

  // Провайдер адресов по умолчанию
  addressProvider: createDaDataProvider({ token: process.env.DADATA_TOKEN }),
})
```

Теперь в приложении:

```tsx
import { AppForm } from '@/lib/form'
<AppForm schema={Schema} initialValue={data} onSubmit={save}>
  <AppForm.Field.String name="title" />
  <AppForm.Select.Category name="categoryId" /> {/* Кастомный */}
  <AppForm.Combobox.Brand name="brandId" /> {/* Lazy-loaded */}
  <AppForm.Field.Address name="address" /> {/* DaData из коробки */}
  <AppForm.Field.DataTable name="items" /> {/* Кастомное поле */}
  <AppForm.Button.Submit />
</AppForm>
```

`createForm` — это `Object.assign` на стероидах: мержит ваши компоненты с базовыми, оборачивает lazy-loaded в `React.lazy()` + `Suspense`, и подставляет addressProvider по умолчанию.

### Lazy-loading в деталях

```typescript
function createLazyComponents(lazyMap) {
  const result = {}
  for (const [name, loader] of Object.entries(lazyMap)) {
    result[name] = React.lazy(loader)
  }
  return result
}
```

Combobox с 10 000 городов не грузится, пока не рендерится. Code splitting бесплатно.

---

## Когда Compound Components — не лучший выбор

Мы не фанатики. Иногда конфиг-подход лучше:

### Когда нужна сериализация

Если схемы форм хранятся в БД (form builder, no-code платформы) — JSON-конфиг удобнее. Для этого у нас есть `Form.FromSchema`:

```tsx
// Генерация из Zod-схемы (по сути, из конфига)
<Form.FromSchema schema={dynamicSchema} initialValue={data} onSubmit={save} exclude={['id', 'createdAt']} />
```

Это гибрид: схема сериализуемая (Zod), но рендер — через Compound Components.

### Когда все формы одинаковые

Если у вас CRUD на 50 моделей и все формы — линейный список полей — `FromSchema` эффективнее ручной вёрстки.

### Наш подход: оба варианта

```
Уровень 1: FromSchema      — одна строка, автогенерация
Уровень 2: AutoFields      — автогенерация + кастомные обёртки
Уровень 3: Form.Field.*    — полный контроль (Compound Components)
Уровень 4: useAppForm      — императивный API для сложных кейсов
```

Начинаете с FromSchema. Когда нужна кастомизация — спускаетесь на уровень ниже. Не нужно переписывать всё.

Бонус schema-driven архитектуры — `FormSkeleton`. Поскольку Zod-схема содержит информацию о количестве и типах полей, библиотека может сгенерировать loading-скелетон автоматически:

```tsx
import { FormSkeleton } from '@letar/forms'

// Пока данные грузятся — скелетон, повторяющий структуру формы
<FormSkeleton fields={OrderSchema} showSubmit />
```

Без schema-driven архитектуры это 15–20 строк ручных `<Skeleton />` компонентов, которые нужно поддерживать синхронно с формой.

---

## Сравнение подходов

| Критерий          | JSON-конфиг (RJSF)          | Compound Components (@letar/forms)      |
| ----------------- | --------------------------- | --------------------------------------- |
| Кастомная вёрстка | Сложно (templates)          | Нативный JSX                            |
| TypeScript        | Слабый                      | Полный (автокомплит, проверка имён)     |
| IDE support       | Минимальный                 | Полный (Go to Definition, autocomplete) |
| Сериализация      | Из коробки                  | Через FromSchema                        |
| Кривая обучения   | Средняя (DSL)               | Низкая (это просто React)               |
| Расширяемость     | Виджеты по строковым ключам | createForm() + React компоненты         |
| Tree-shaking      | Сложно                      | Object.assign + lazy()                  |

---

## Итоги

Compound Components — это не «модный паттерн ради паттерна». Это осознанный выбор:

1. **JSX для вёрстки, Zod для логики** — каждый инструмент для своей задачи
2. **TypeScript первый** — ошибки в именах полей ловятся компилятором
3. **Один импорт** — `Form` содержит всё, discoverable через точку
4. **Расширяемость** — `createForm()` для app-specific полей с lazy-loading
5. **Спектр контроля** — от `FromSchema` (ноль JSX) до `useAppForm` (полный контроль)

---

## Попробовать

<details>
<summary>Установка</summary>

```bash
bun add @letar/forms
```

```tsx
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  name: z.string().min(2).meta({ ui: { title: 'Имя' } }),
  email: z.email().meta({ ui: { title: 'Email' } }),
})

<Form schema={Schema} initialValue={{ name: '', email: '' }} onSubmit={save}>
  <Form.Field.String name="name" />
  <Form.Field.String name="email" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

</details>

- [Документация](https://forms.letar.best)
- [Живой пример: basic](https://forms-example.letar.best/examples/basic)
- [Все поля (39)](https://forms-example.letar.best/examples/all-fields)
- [GitHub](https://github.com/kamiletar/letar-forms)
- [MCP для AI](https://www.npmjs.com/package/@letar/form-mcp)

---

**Навигация по серии**
← Предыдущая: [Zod .meta() — одна схема для валидации, UI и доступности](02-zod-meta-single-source.md)
→ Следующая: [50+ готовых полей для React-форм](04-40-fields.md)

---

**Compound Components или JSON-конфиг? Что используете и почему?**
