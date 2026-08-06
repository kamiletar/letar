# UX Patterns Audit Reference

## Navigation Patterns

### Primary Navigation

```tsx
// ✅ Консистентная навигация
<Box as="nav" aria-label="Главное меню">
  <HStack gap={4}>
    <NavLink href="/" isActive={pathname === '/'}>
      Главная
    </NavLink>
    <NavLink href="/catalog" isActive={pathname.startsWith('/catalog')}>
      Каталог
    </NavLink>
  </HStack>
</Box>

// ✅ Индикация текущей страницы
function NavLink({ href, isActive, children }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      fontWeight={isActive ? 'bold' : 'normal'}
      color={isActive ? 'blue.500' : 'fg.default'}
    >
      {children}
    </Link>
  )
}
```

### Mobile Navigation

```tsx
// ✅ Drawer для мобильной навигации
<Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
  <Drawer.Trigger asChild>
    <IconButton display={{ base: 'flex', md: 'none' }} aria-label="Открыть меню" icon={<HamburgerIcon />} />
  </Drawer.Trigger>
  <Drawer.Backdrop />
  <Drawer.Positioner>
    <Drawer.Content>
      <Drawer.Header>
        <Drawer.Title>Меню</Drawer.Title>
        <Drawer.CloseTrigger />
      </Drawer.Header>
      <Drawer.Body>
        <VStack align="stretch" gap={2}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </VStack>
      </Drawer.Body>
    </Drawer.Content>
  </Drawer.Positioner>
</Drawer.Root>
```

### Breadcrumbs

```tsx
// ✅ Хлебные крошки для иерархии
<Breadcrumb.Root>
  <Breadcrumb.List>
    <Breadcrumb.Item>
      <Breadcrumb.Link href="/">Главная</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Separator />
    <Breadcrumb.Item>
      <Breadcrumb.Link href="/catalog">Каталог</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Separator />
    <Breadcrumb.Item>
      <Breadcrumb.CurrentLink>Товар</Breadcrumb.CurrentLink>
    </Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb.Root>
```

---

## Feedback States

### Loading States

```tsx
// ✅ Skeleton для загрузки списков
{isLoading ? (
  <VStack gap={4}>
    {[1, 2, 3].map(i => (
      <Skeleton key={i} height="100px" borderRadius="md" />
    ))}
  </VStack>
) : (
  <VStack gap={4}>
    {items.map(item => <Card key={item.id} {...item} />)}
  </VStack>
)}

// ✅ Spinner для действий (через Form)
<Form.Button.Submit>
  Сохранить  {/* Автоматически показывает spinner при isSubmitting */}
</Form.Button.Submit>

// ✅ Progress для длительных операций
<Progress.Root value={progress}>
  <Progress.Track>
    <Progress.Range />
  </Progress.Track>
  <Progress.ValueText>{progress}%</Progress.ValueText>
</Progress.Root>
```

### Success Feedback

```tsx
// ✅ Toast для успешных действий
import { toaster } from '@/components/ui/toaster'

async function handleSave() {
  await saveData()
  toaster.success({
    title: 'Сохранено',
    description: 'Изменения успешно сохранены',
  })
}

// ✅ Inline success message
{
  isSuccess && (
    <Alert status="success">
      <Alert.Indicator />
      <Alert.Title>Данные сохранены</Alert.Title>
    </Alert>
  )
}
```

### Error Feedback

```tsx
// ✅ Toast для ошибок
toaster.error({
  title: 'Ошибка',
  description: 'Не удалось сохранить данные. Попробуйте позже.',
})

// ✅ Form.Errors для сводки ошибок формы
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Errors title="Исправьте ошибки:" />
  <Form.AutoFields />
  <Form.Button.Submit />
</Form>

// ✅ Error boundary для критических ошибок
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

---

## Form UX (@letar/forms)

> ⚠️ **CRITICAL:** Всегда читай `libs/forms/README.md` перед работой с формами!

### Декларативный API

```tsx
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

// ✅ UI метаданные в схеме
const Schema = z.object({
  title: z.string().min(2).meta({ ui: { title: 'Название', placeholder: 'Введите...' } }),
  email: z.string().email().meta({ ui: { title: 'Email' } }),
  rating: z.number().min(0).max(10).meta({ ui: { title: 'Рейтинг' } }),
}).strip()  // ⚠️ Всегда .strip() для Zod v4

// ✅ Декларативная форма
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Field.String name="title" />
  <Form.Field.String name="email" />
  <Form.Field.Number name="rating" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

### Автогенерация форм

```tsx
// ✅ Полная автогенерация из схемы
<Form.FromSchema
  schema={ProductCreateFormSchema}
  initialValue={data}
  onSubmit={handleSubmit}
  submitLabel="Создать"
/>

// ✅ Или частичная автогенерация
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.AutoFields />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

### 40+ типов полей

```tsx
// Текстовые
<Form.Field.String name="title" />
<Form.Field.Textarea name="description" />
<Form.Field.RichText name="content" />

// Числовые
<Form.Field.Number name="price" />
<Form.Field.Slider name="rating" />
<Form.Field.Currency name="amount" />

// Выбор
<Form.Field.Select name="category" />
<Form.Field.RadioGroup name="type" />
<Form.Field.Checkbox name="agree" />

// Специальные
<Form.Field.Date name="birthday" />
<Form.Field.Phone name="phone" />
<Form.Field.FileUpload name="avatar" />
```

### Условный рендеринг

```tsx
// ✅ Form.When для условных полей
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Field.Select name="type" />

  <Form.When field="type" is="company">
    <Form.Field.String name="companyName" />
    <Form.Field.String name="inn" />
  </Form.When>

  <Form.When field="type" is="individual">
    <Form.Field.String name="passport" />
  </Form.When>

  <Form.Button.Submit />
</Form>
```

### Мультистеп формы

```tsx
// ✅ Form.Steps для wizard-форм
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Steps animated validateOnNext>
    <Form.Steps.Step title="Основное">
      <Form.Field.String name="name" />
      <Form.Field.String name="email" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Адрес">
      <Form.Field.String name="city" />
      <Form.Field.String name="street" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Подтверждение">
      <Form.Field.Checkbox name="agree" />
    </Form.Steps.Step>

    <Form.Steps.Navigation />
  </Form.Steps>
</Form>
```

### Группы и массивы

```tsx
// ✅ Вложенный объект
<Form.Group name="address">
  <Form.Field.String name="city" />    {/* → address.city */}
  <Form.Field.String name="street" />  {/* → address.street */}
</Form.Group>

// ✅ Массив
<Form.Group.List name="phones">
  <Form.Field.Phone />
  <Form.Group.List.Button.Add>Добавить телефон</Form.Group.List.Button.Add>
</Form.Group.List>
```

### Сводка ошибок

```tsx
// ✅ Form.Errors для отображения всех ошибок
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Errors title="Исправьте ошибки:" />
  <Form.AutoFields />
  <Form.Button.Submit />
</Form>
```

### ZenStack интеграция

```zmodel
model Product {
  /// @form.title("Название продукта")
  /// @form.placeholder("Введите название")
  title String

  /// @form.title("Цена")
  /// @form.fieldType("currency")
  /// @form.props({ min: 0, currency: "RUB" })
  price Int
}
```

```tsx
import { ProductCreateFormSchema } from '@/generated/form-schemas'
<Form.FromSchema schema={ProductCreateFormSchema} initialValue={data} onSubmit={save} />
```

### Offline формы

```tsx
// ✅ Оффлайн поддержка
<Form
  initialValue={data}
  offline={{
    actionType: 'UPDATE_PROFILE',
    onQueued: () => toast.info('Сохранено локально'),
    onSynced: () => toast.success('Синхронизировано'),
  }}
  onSubmit={handleSubmit}
>
  <Form.OfflineIndicator />
  <Form.AutoFields />
  <Form.Button.Submit />
</Form>
```

---

## Empty States

### Пустой список

```tsx
// ✅ Информативное пустое состояние
<EmptyState.Root>
  <EmptyState.Content>
    <EmptyState.Indicator>
      <InboxIcon />
    </EmptyState.Indicator>
    <VStack textAlign="center">
      <EmptyState.Title>Нет товаров</EmptyState.Title>
      <EmptyState.Description>Добавьте первый товар в каталог</EmptyState.Description>
    </VStack>
    <Button>Добавить товар</Button>
  </EmptyState.Content>
</EmptyState.Root>
```

### Пустой поиск

```tsx
// ✅ Пустой результат поиска с подсказками
<EmptyState.Root>
  <EmptyState.Content>
    <EmptyState.Indicator>
      <SearchIcon />
    </EmptyState.Indicator>
    <VStack textAlign="center">
      <EmptyState.Title>Ничего не найдено</EmptyState.Title>
      <EmptyState.Description>
        По запросу "{query}" ничего не найдено. Попробуйте изменить параметры поиска.
      </EmptyState.Description>
    </VStack>
    <Button variant="ghost" onClick={clearFilters}>
      Сбросить фильтры
    </Button>
  </EmptyState.Content>
</EmptyState.Root>
```

---

## Error Handling UI

### 404 Page

```tsx
// ✅ Дружелюбная 404 страница
export default function NotFound() {
  return (
    <Center minH="60vh">
      <VStack gap={4} textAlign="center">
        <Heading size="2xl">404</Heading>
        <Text fontSize="lg" color="fg.muted">
          Страница не найдена
        </Text>
        <Button asChild>
          <Link href="/">Вернуться на главную</Link>
        </Button>
      </VStack>
    </Center>
  )
}
```

### Error Page

```tsx
// ✅ Страница ошибки с retry
export default function Error({ error, reset }) {
  return (
    <Center minH="60vh">
      <VStack gap={4} textAlign="center">
        <Icon as={WarningIcon} boxSize={12} color="red.500" />
        <Heading size="lg">Что-то пошло не так</Heading>
        <Text color="fg.muted">Произошла ошибка при загрузке страницы</Text>
        <HStack>
          <Button onClick={reset}>Попробовать снова</Button>
          <Button variant="ghost" asChild>
            <Link href="/">На главную</Link>
          </Button>
        </HStack>
      </VStack>
    </Center>
  )
}
```

### Network Error

```tsx
// ✅ Обработка сетевых ошибок
{
  error?.message === 'Failed to fetch' && (
    <Alert status="warning">
      <Alert.Indicator />
      <VStack align="start" gap={1}>
        <Alert.Title>Нет соединения</Alert.Title>
        <Alert.Description>Проверьте подключение к интернету</Alert.Description>
      </VStack>
    </Alert>
  )
}
```

---

## Confirmation Dialogs

```tsx
// ✅ Подтверждение опасных действий
<Dialog.Root>
  <Dialog.Trigger asChild>
    <Button colorPalette="red" variant="outline">
      Удалить
    </Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Удалить товар?</Dialog.Title>
    </Dialog.Header>
    <Dialog.Body>Это действие нельзя отменить.</Dialog.Body>
    <Dialog.Footer>
      <Dialog.CloseTrigger asChild>
        <Button variant="ghost">Отмена</Button>
      </Dialog.CloseTrigger>
      <Button colorPalette="red" onClick={handleDelete}>
        Удалить
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

---

## Micro-interactions

### Hover Effects

```tsx
// ✅ Subtle hover feedback
<Card
  transition="transform 0.2s, shadow 0.2s"
  _hover={{
    transform: 'translateY(-2px)',
    shadow: 'lg',
  }}
>
```

### Click Feedback

```tsx
// ✅ Active state для кнопок
<Button
  _active={{
    transform: 'scale(0.98)',
  }}
>
  Кнопка
</Button>
```

### Focus Feedback

```tsx
// ✅ Visible focus ring
<Input
  _focus={{
    borderColor: 'blue.500',
    boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
  }}
/>
```

---

## Чеклист UX Patterns Аудита

### Критичные (MUST)

- [ ] Навигация консистентна на всех страницах
- [ ] Loading states для всех async операций
- [ ] Error messages понятны пользователю
- [ ] Формы используют `@letar/forms` (не сырой TanStack Form)
- [ ] `.strip()` на всех Zod схемах форм

### Важные (SHOULD)

- [ ] Empty states информативны
- [ ] Breadcrumbs для глубокой иерархии
- [ ] Confirmation dialogs для destructive actions
- [ ] Success feedback после действий
- [ ] Form.Errors для сводки ошибок

### Рекомендуемые (COULD)

- [ ] Skeleton loading вместо спиннеров
- [ ] Micro-interactions для feedback
- [ ] Form.Steps для сложных форм
- [ ] Offline support с Form.OfflineIndicator
