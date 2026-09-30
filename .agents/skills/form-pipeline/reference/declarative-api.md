# Декларативный Form API

## Основная философия

Отделение вёрстки от логики:

| Аспект        | Где определяется           | В JSX                  |
| ------------- | -------------------------- | ---------------------- |
| Валидация     | Zod схема                  | `schema={Schema}`      |
| UI метаданные | Zod `.meta({ ui: {...} })` | Автоматически          |
| Структура     | TypeScript типы            | `initialValue={data}`  |
| Вёрстка       | JSX                        | `<HStack>`, `<VStack>` |

## Form компонент

```tsx
<Form
  schema={Schema} // Zod схема валидации
  initialValue={data} // Начальные значения
  onSubmit={handleSubmit} // Обработчик отправки
  validateOn="blur" // 'change' | 'blur' | 'submit'
  disabled={false} // Глобальный disabled
  readOnly={false} // Глобальный readOnly
>
  <Form.Field.String name="title" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

## Form.Field.\*

Поля автоматически читают из схемы:

- `label` → из `meta.ui.title`
- `placeholder` → из `meta.ui.placeholder`
- `helperText` → из `meta.ui.description`
- `required` → из Zod (не optional)
- constraints → из `.min()`, `.max()`, etc.

```tsx
// Всё из схемы
<Form.Field.String name="title" />

// Override при необходимости
<Form.Field.String name="title" label="Custom Label" />
```

## Form.Group — вложенные объекты

```tsx
<Form.Group name="address">
  <Form.Field.String name="city" /> {/* address.city */}
  <Form.Field.String name="street" /> {/* address.street */}
</Form.Group>
```

## Form.Group.List — массивы

```tsx
<Form.Group.List
  name="items"
  emptyContent="Нет элементов"
  wrapper={({ children }) => (
    <VStack>
      {children}
      <Form.Group.List.Button.Add defaultValue={{ name: '' }}>Добавить</Form.Group.List.Button.Add>
    </VStack>
  )}
>
  <HStack>
    <Form.Field.String name="name" />
    <Form.Group.List.Button.Remove />
  </HStack>
</Form.Group.List>
```

Примитивные массивы:

```tsx
<Form.Group.List name="tags">
  <Form.Field.String /> {/* без name */}
</Form.Group.List>
```

## Form.When — условный рендеринг

```tsx
<Form.Field.Select name="type" options={[
  { label: 'Физлицо', value: 'individual' },
  { label: 'Компания', value: 'company' },
]} />

<Form.When field="type" is="company">
  <Form.Field.String name="companyName" />
  <Form.Field.String name="inn" />
</Form.When>

// Кастомное условие
<Form.When field="age" condition={(age) => age >= 18}>
  <Form.Field.Checkbox name="adultContent" />
</Form.When>

// С fallback
<Form.When field="isPremium" is={true} fallback={<Text>Доступно в Premium</Text>}>
  <Form.Field.Select name="premiumTheme" options={themes} />
</Form.When>
```

## Form.Steps — мультистеп

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Steps animated validateOnNext linear>
    <Form.Steps.Indicator />

    <Form.Steps.Step title="Личные данные">
      <Form.Field.String name="firstName" />
      <Form.Field.String name="lastName" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Контакты">
      <Form.Field.String name="email" />
      <Form.Field.Phone name="phone" />
    </Form.Steps.Step>

    <Form.Steps.Navigation />
  </Form.Steps>
</Form>
```

## Form.Button.\*

```tsx
<Form.Button.Submit>Сохранить</Form.Button.Submit>  {/* loading автоматически */}
<Form.Button.Reset>Сбросить</Form.Button.Reset>
```

## Form.Errors — сводка ошибок

```tsx
<Form.Errors title="Исправьте ошибки:" />
```

## Form.FromSchema — полная автогенерация

```tsx
<Form.FromSchema
  schema={ProductSchema}
  initialValue={data}
  onSubmit={save}
  submitLabel="Создать"
  showReset
  exclude={['id', 'createdAt']}
/>
```

## Form.AutoFields — частичная генерация

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <VStack>
    <Form.AutoFields include={['title', 'description']} />
    <Form.Field.RichText name="content" /> {/* Ручное поле */}
    <Form.Button.Submit>Сохранить</Form.Button.Submit>
  </VStack>
</Form>
```

## Middleware

```tsx
<Form
  middleware={{
    beforeSubmit: async (data) => {
      if (!(await validate(data))) return undefined  // отмена
      return { ...data, timestamp: Date.now() }
    },
    afterSuccess: () => {
      toaster.success({ title: 'Сохранено!' })
      router.push('/list')
    },
    onError: (error) => {
      toaster.error({ title: error.message })
    },
  }}
>
```

## Persistence (localStorage)

```tsx
<Form
  persistence={{
    key: 'unique-form-key',
    debounceMs: 500,
    dialogTitle: 'Восстановить?',
    restoreButtonText: 'Восстановить',
    discardButtonText: 'Начать заново',
  }}
>
```

## Offline Support

```tsx
<Form initialValue={data} onSubmit={save}>
  <Form.OfflineIndicator />
  <Form.SyncStatus />
  <Form.Field.String name="title" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```
