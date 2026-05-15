# Генерация форм из схемы

Автоматическая генерация полей и форм из Zod схем.

## Обзор подходов

| Компонент         | Описание                             |
| ----------------- | ------------------------------------ |
| `Form.FromSchema` | Полная генерация формы (одна строка) |
| `Form.AutoFields` | Генерация полей внутри Form          |
| `Form.Field.Auto` | Автоопределение типа поля по имени   |
| `Form.Builder`    | Генерация из JSON конфигурации       |

---

## Form.FromSchema — Полная генерация (v0.47.0+)

Автоматически создаёт форму со всеми полями на основе Zod схемы:

```tsx
const UserSchema = z.object({
  firstName: z.string().min(2).meta({ ui: { title: 'Имя' } }),
  lastName: z.string().min(2).meta({ ui: { title: 'Фамилия' } }),
  email: z.string().email().meta({ ui: { title: 'Email' } }),
  age: z.number().min(18).meta({ ui: { title: 'Возраст' } }),
  bio: z.string().max(500).meta({ ui: { title: 'О себе', fieldType: 'textarea' } }),
  role: z.enum(['admin', 'user', 'guest']).meta({ ui: { title: 'Роль' } }),
  isActive: z.boolean().meta({ ui: { title: 'Активен' } }),
})

// Одна строка — полная форма!
<Form.FromSchema
  schema={UserSchema}
  initialValue={{ firstName: '', lastName: '', email: '', age: 25, bio: '', role: 'user', isActive: true }}
  onSubmit={handleSubmit}
  submitLabel="Создать пользователя"
  showReset
  resetLabel="Очистить"
/>
```

**Props:**

| Prop            | Тип                                | Default       | Описание                        |
| --------------- | ---------------------------------- | ------------- | ------------------------------- |
| `schema`        | `ZodSchema`                        | (обязателен)  | Zod схема для валидации и полей |
| `initialValue`  | `TData`                            | (обязателен)  | Начальные значения              |
| `onSubmit`      | `(data: TData) => void \| Promise` | (обязателен)  | Обработчик отправки             |
| `submitLabel`   | `ReactNode`                        | `'Сохранить'` | Текст кнопки submit             |
| `showReset`     | `boolean`                          | `false`       | Показать кнопку сброса          |
| `resetLabel`    | `ReactNode`                        | `'Сбросить'`  | Текст кнопки reset              |
| `exclude`       | `string[]`                         | `[]`          | Поля для исключения             |
| `validateOn`    | `ValidateOn \| ValidateOn[]`       | -             | Режим валидации                 |
| `middleware`    | `FormMiddleware<TData>`            | -             | Перехватчики событий            |
| `disabled`      | `boolean`                          | -             | Отключить все поля              |
| `readOnly`      | `boolean`                          | -             | Только для чтения               |
| `persistence`   | `FormPersistenceConfig`            | -             | localStorage persistence        |
| `offline`       | `FormOfflineConfig`                | -             | Оффлайн режим                   |
| `beforeButtons` | `ReactNode`                        | -             | Контент перед кнопками          |
| `afterButtons`  | `ReactNode`                        | -             | Контент после кнопок            |
| `gap`           | `number`                           | `4`           | Gap между полями                |

---

## Form.AutoFields — Генерация полей (v0.47.0+)

Генерирует поля из Zod схемы внутри Form с возможностью кастомного layout:

```tsx
<Form schema={ProfileSchema} initialValue={data} onSubmit={save}>
  <VStack gap={4}>
    {/* Только имя */}
    <Form.AutoFields include={['name']} />

    {/* Всё кроме имени */}
    <Box p={4} bg="gray.50">
      <Form.AutoFields exclude={['name']} />
    </Box>

    <Form.Button.Submit>Сохранить</Form.Button.Submit>
  </VStack>
</Form>
```

**Props:**

| Prop           | Тип                                                      | Default | Описание                       |
| -------------- | -------------------------------------------------------- | ------- | ------------------------------ |
| `include`      | `string[]`                                               | -       | Только эти поля                |
| `exclude`      | `string[]`                                               | -       | Исключить эти поля             |
| `recursive`    | `boolean`                                                | `true`  | Генерировать вложенные объекты |
| `fieldWrapper` | `(props: { name: string; children: ReactNode }) => Elem` | -       | Обёртка для каждого поля       |

**Вложенные объекты:**

Автоматически генерируются как `Form.Group`:

```tsx
// Схема
z.object({
  settings: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
  }),
})

// AutoFields генерирует:
<Form.Group name="settings">
  <Form.Field.NativeSelect name="theme" />
  <Form.Field.Checkbox name="notifications" />
</Form.Group>
```

---

## fieldType в meta — Указание типа поля (v0.47.0+)

Для полей, которые нельзя определить автоматически, указывайте `fieldType` в meta:

```tsx
const ArticleSchema = z.object({
  title: z.string().meta({ ui: { title: 'Заголовок' } }),                    // → FieldString
  content: z.string().meta({ ui: { title: 'Контент', fieldType: 'richText' } }), // → FieldRichText
  rating: z.number().meta({ ui: { title: 'Рейтинг', fieldType: 'rating' } }),    // → FieldRating
  schedule: z.any().meta({ ui: { title: 'Расписание', fieldType: 'schedule' } }), // → FieldSchedule
  published: z.boolean().meta({ ui: { title: 'Опубликовано', fieldType: 'switch' } }), // → FieldSwitch
})

<Form schema={ArticleSchema} initialValue={data} onSubmit={save}>
  <Form.Field.Auto name="title" />    {/* автоматически FieldString */}
  <Form.Field.Auto name="content" />  {/* richText из meta */}
  <Form.Field.Auto name="rating" />   {/* rating из meta */}
  <Form.Field.Auto name="schedule" /> {/* schedule из meta */}
  <Form.Field.Auto name="published" /> {/* switch из meta */}
</Form>
```

**Поддерживаемые fieldType:**

| Категория   | Типы                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Текстовые   | `string`, `textarea`, `password`, `passwordStrength`, `editable`, `richText`                                                         |
| Числовые    | `number`, `numberInput`, `slider`, `rating`, `currency`, `percentage`                                                                |
| Дата/время  | `date`, `time`, `dateRange`, `dateTimePicker`, `duration`, `schedule`                                                                |
| Булевые     | `checkbox`, `switch`                                                                                                                 |
| Выбор       | `select`, `nativeSelect`, `combobox`, `autocomplete`, `listbox`, `radioGroup`, `radioCard`, `segmentedGroup`, `checkboxCard`, `tags` |
| Специальные | `phone`, `address`, `pinInput`, `otpInput`, `colorPicker`, `fileUpload`, `maskedInput`                                               |

**fieldProps — дополнительные props:**

```tsx
z.string().meta({
  ui: {
    title: 'Адрес',
    fieldType: 'address',
    fieldProps: {
      token: process.env.NEXT_PUBLIC_DADATA_TOKEN,
    },
  },
})
```

---

## Смешанный подход — AutoFields + ручные поля

Комбинируйте автогенерацию с ручным контролем:

```tsx
<Form schema={ArticleSchema} initialValue={data} onSubmit={save}>
  <VStack gap={4}>
    {/* Автоматическая генерация для простых полей */}
    <HStack>
      <Form.Field.Auto name="title" />
      <Form.Field.Auto name="slug" />
    </HStack>

    <Form.Field.Auto name="category" />

    {/* Ручной контроль для сложных полей */}
    <Form.Field.RichText name="content" label="Контент статьи" minHeight="300px" />

    <Form.Button.Submit>Опубликовать</Form.Button.Submit>
  </VStack>
</Form>
```

---

## Form.Builder — Генерация из JSON (v0.43.0+)

Создание формы из декларативной конфигурации:

```tsx
const config = {
  fields: [
    { type: 'string', name: 'firstName', label: 'Имя' },
    { type: 'string', name: 'lastName', label: 'Фамилия' },
    { type: 'string', name: 'email', placeholder: 'email@example.com' },
    { type: 'number', name: 'age', min: 0, max: 120 },
    { type: 'select', name: 'role', options: [
      { label: 'Пользователь', value: 'user' },
      { label: 'Администратор', value: 'admin' },
    ]},
    { type: 'checkbox', name: 'newsletter' },
  ]
}

<Form.Builder
  config={config}
  initialValue={{ firstName: '', lastName: '', email: '', age: 18, role: 'user', newsletter: false }}
  onSubmit={handleSubmit}
  schema={UserSchema}  // опционально
  submitLabel="Зарегистрироваться"
/>
```

**Поддерживаемые типы:** `string`, `textarea`, `number`, `currency`, `percentage`, `slider`, `rating`, `checkbox`, `switch`, `select`, `date`, `password`, `phone`, `auto`.

**С секциями:**

```tsx
const config = {
  sections: [
    {
      title: 'Личные данные',
      fields: [
        { type: 'string', name: 'firstName' },
        { type: 'string', name: 'lastName' },
      ],
    },
    {
      title: 'Контакты',
      fields: [
        { type: 'string', name: 'email' },
        { type: 'phone', name: 'phone' },
      ],
    },
  ],
}
```

---

## Связанные документы

- [README.md](../README.md) — обзор библиотеки
- [zenstack.md](./zenstack.md) — ZenStack интеграция
- [fields.md](./fields.md) — Field компоненты
