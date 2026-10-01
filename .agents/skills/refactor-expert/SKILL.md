---
name: refactor-expert
description: |
  Рефакторинг по архитектуре монорепо: React-компоненты, хуки, server actions, ZenStack-модели, API-роуты, вынос в libs/. Загружай ДО массовой правки и когда чистишь запрещённый as= в Chakra (asChild берёт только первого ребёнка), выносишь код в lib и потребитель падает на чужих window/StorageEvent, реэкспорт через barrel тянет next/* в Vite, коммит уносит чужие правки.
---

Ты — эксперт по рефакторингу в Nx монорепозитории с Next.js 16, React 19, Chakra UI v3, ZenStack, TanStack Form.

## ⚠️ Ловушки (разборы в доках)

- [chakra-icon-as-prop-cleanup-pattern](/.claude/docs/chakra-icon-as-prop-cleanup-pattern.md) — рецепт чистки `as=` в Chakra
- [chakra-aschild-multiple-children-silent-drop](/.claude/docs/chakra-aschild-multiple-children-silent-drop.md) — `asChild` с двумя детьми молча берёт первого
- [lib-consumer-missing-lib-dom](/.claude/docs/lib-consumer-missing-lib-dom.md) — barrel-реэкспорт затягивает чужие `window`/`StorageEvent` в `tsc --build` потребителя
- [vite-dev-letar-ui-barrel-process-undefined](/.claude/docs/vite-dev-letar-ui-barrel-process-undefined.md) — barrel `@letar/ui` под Vite тянет `next/*`
- [git-pathspec-commit-worktree-not-index](/.claude/docs/git-pathspec-commit-worktree-not-index.md) — `git commit -- <каталог>` забирает чужой WIP

## Критичные правила

1. **Поведение НЕ меняется** — рефакторинг улучшает структуру, не функциональность
2. **Тесты обязательны** — до и после рефакторинга тесты должны проходить
3. **Маленькие шаги** — один тип изменений за раз
4. **Комментарии на русском** — весь проект использует русский для документации

## Типы рефакторинга

### 1. React компоненты

**Extract Component:**

```tsx
// ❌ До: монолит
function ProductPage({ product }) {
  return (
    <Box>
      <Image src={product.image} />
      <Text>{product.name}</Text>
      <Text>{product.price}</Text>
      <Button>В корзину</Button>
    </Box>
  )
}

// ✅ После: композиция
function ProductPage({ product }) {
  return (
    <Box>
      <ProductImage src={product.image} alt={product.name} />
      <ProductInfo product={product} />
      <AddToCartButton productId={product.id} />
    </Box>
  )
}
```

**Server vs Client Components:**

```tsx
// ❌ До: 'use client' без необходимости
'use client'
function StaticList({ items }) {
  return (
    <ul>
      {items.map((i) => <li key={i.id}>{i.name}</li>)}
    </ul>
  )
}

// ✅ После: Server Component (по умолчанию)
function StaticList({ items }) {
  return (
    <ul>
      {items.map((i) => <li key={i.id}>{i.name}</li>)}
    </ul>
  )
} // ✅ 'use client' только когда нужны хуки/события

'use client'
function InteractiveList({ items }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <ul>
      {items.map((i) => (
        <li key={i.id} onClick={() => setSelected(i.id)}>
          {i.name} {selected === i.id && '✓'}
        </li>
      ))}
    </ul>
  )
}
```

### 2. Chakra UI v3 миграция

```tsx
// ❌ Chakra v2 API
<Button isLoading isDisabled colorScheme="blue">
<Stack spacing={4}>
<Modal isOpen={isOpen} onClose={onClose}>

// ✅ Chakra v3 API
<Button loading disabled colorPalette="blue">
<Stack gap={4}>
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Backdrop />
  <Dialog.Positioner>
    <Dialog.Content>
      <Dialog.Header />
      <Dialog.Body />
      <Dialog.Footer />
    </Dialog.Content>
  </Dialog.Positioner>
</Dialog.Root>
```

### 3. Compound Components

```tsx
// ❌ Монолитный
<Card title="Заголовок" description="Описание" footer={<Button>Действие</Button>} />

// ✅ Compound
<Card.Root>
  <Card.Header>
    <Card.Title>Заголовок</Card.Title>
    <Card.Description>Описание</Card.Description>
  </Card.Header>
  <Card.Body>Контент</Card.Body>
  <Card.Footer><Button>Действие</Button></Card.Footer>
</Card.Root>
```

### 4. Хуки и логика

**Extract Custom Hook:**

```tsx
// ❌ До: логика в компоненте
function ProductList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then(setProducts)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  if (loading) { return <Spinner /> }
  if (error) { return <Text color="red">{error.message}</Text> }
  return <List items={products} />
}

// ✅ После: кастомный хук
function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then(setProducts)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { products, loading, error }
}

function ProductList() {
  const { products, loading, error } = useProducts()

  if (loading) { return <Spinner /> }
  if (error) { return <Text color="red">{error.message}</Text> }
  return <List items={products} />
}
```

### 4. Server Actions

**Улучшение структуры:**

```tsx
// ❌ До: всё в одном файле
// page.tsx
async function createProduct(data) {
  'use server'
  const parsed = ProductSchema.safeParse(data)
  if (!parsed.success) { return { error: parsed.error } }
  await db.product.create({ data: parsed.data })
  revalidatePath('/products')
} // ✅ После: выделено в _actions/
// _actions/create-product.ts

'use server'

import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { CreateProductSchema } from '../_schemas/product.schema'

export async function createProduct(data: unknown) {
  const parsed = CreateProductSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const db = await getEnhancedPrisma()
  await db.product.create({ data: parsed.data })

  revalidatePath('/products')
  return { success: true }
}
```

### 5. Zod схемы

```tsx
// ❌ До: разбросаны по файлам
const schema = z.object({ name: z.string() })

// ✅ После: централизованы в _schemas/
// _schemas/product.schema.ts
import { z } from 'zod/v4'

export const ProductBaseSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа').max(100),
  price: z.number().positive('Цена должна быть положительной'),
  categoryId: z.string().cuid(),
})

// Всегда .strip() для удаления лишних полей
export const CreateProductSchema = ProductBaseSchema.strip()

export const UpdateProductSchema = ProductBaseSchema.partial().strip()

export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>
```

### 6. ZenStack модели

```zmodel
// ❌ До: без access policies
model Product {
  id    String @id @default(cuid())
  name  String
  price Decimal
}

// ✅ После: с политиками и @meta (основной синтаксис с Фазы 3 zenstack-form-plugin v3.0.0;
// legacy /// @form.*-комментарии убраны в plugin v4.0.0)
model Product {
  id    String @id @default(cuid())

  name  String @meta("form.title", "Название") @meta("form.placeholder", "Введите название товара")

  price Decimal @meta("form.title", "Цена") @meta("form.fieldType", "currency")

  internalCode String? @meta("form.exclude", true)

  // Access policies
  @@allow('read', true)
  @@allow('create', auth().role == 'ADMIN')
  @@allow('update', auth().role == 'ADMIN')
  @@allow('delete', auth().role == 'ADMIN')
}
```

### 7. Импорты

```tsx
// ❌ До: неправильные импорты
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

// ✅ После: правильные импорты проекта
import { ProductFormSchema } from '@/generated/form-schemas/Product.form'
import { getEnhancedPrisma } from '@/lib/db'
import { ChakraFormField, FormGroup, useAppForm } from '@letar/forms'
import { z } from 'zod/v4'
```

## Workflow рефакторинга

### 1. Анализ (ОБЯЗАТЕЛЬНО)

```bash
# Прочитать код
Read <файл>

# Найти связанные файлы
Grep "ComponentName" --type tsx
Glob "**/*product*"

# Проверить тесты
nx test <app> -- <путь к файлу>   # Vitest 4: фильтр — позиционный аргумент
```

### 2. План рефакторинга

Определи:

- Что именно рефакторим
- Какой тип рефакторинга
- Какие файлы затронуты
- Риски (breaking changes)

### 3. Выполнение

```bash
# Маленькими шагами
Edit <файл> # Одно изменение

# После каждого шага — проверка
nx typecheck:tsgo <app>
nx lint <app>
nx test <app>
```

### 4. Финальная проверка

```bash
# Полный pipeline
nx run-many -t format --projects=<app>
nx lint <app>
nx typecheck:tsgo <app>
nx test <app>
```

## Паттерны улучшения

### Extract (выделение)

| Что                  | Куда          | Когда                        |
| -------------------- | ------------- | ---------------------------- |
| JSX блок             | Компонент     | > 20 строк, переиспользуется |
| useState + useEffect | Custom hook   | Логика переиспользуется      |
| Server logic         | Server Action | Мутации данных               |
| Validation           | Zod schema    | Любая валидация              |
| Types                | Interface     | Используется в 2+ местах     |

### Simplify (упрощение)

| Было              | Стало                 |
| ----------------- | --------------------- |
| Вложенные if/else | Early return / switch |
| Callback hell     | async/await           |
| Много пропсов     | Объект конфига        |
| Дублирование      | Утилита / компонент   |

### Rename (переименование)

| Было          | Стало             | Почему             |
| ------------- | ----------------- | ------------------ |
| `data`        | `products`        | Конкретнее         |
| `handleClick` | `handleAddToCart` | Описывает действие |
| `Component1`  | `ProductCard`     | Семантика          |

## Чеклист

- [ ] Тесты проходят ДО рефакторинга
- [ ] Тесты проходят ПОСЛЕ рефакторинга
- [ ] Поведение НЕ изменилось
- [ ] Код стал проще/читаемее
- [ ] TypeScript типы корректны
- [ ] ESLint без ошибок
- [ ] Комментарии на русском
- [ ] 'use client' только где нужно
- [ ] Импорты из правильных источников
- [ ] Zod схемы с .strip()

## Формат вывода

### До

```tsx
// Показать исходный код
```

### После

```tsx
// Показать рефакторенный код
```

### Изменения

- Что изменилось
- Почему это лучше
- Какие файлы затронуты

### Команды для проверки

```bash
nx typecheck:tsgo <app>
nx lint <app>
nx test <app>
```
