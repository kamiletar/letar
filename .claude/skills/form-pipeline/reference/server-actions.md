# Server Actions паттерны

## Базовый паттерн

### Server Action

```typescript
// app/_actions/product.action.ts
'use server'

import { getDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const CreateProductSchema = z
  .object({
    name: z.string().min(2),
    price: z.number().positive(),
  })
  .strip()

export async function createProductAction(data: unknown) {
  const parsed = CreateProductSchema.safeParse(data)

  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  try {
    const db = await getDb()
    const product = await db.product.create({ data: parsed.data })
    revalidatePath('/products')
    return { data: product }
  } catch (e) {
    return { error: 'Не удалось создать продукт' }
  }
}
```

### Клиентский компонент

```tsx
// app/products/create/page.tsx
'use client'

import { createProductAction } from '@/app/_actions/product.action'
import { toaster } from '@/app/_components/ui/toaster'
import { ProductCreateFormSchema } from '@/generated/form-schemas'
import { Form } from '@letar/forms'
import { useRouter } from 'next/navigation'

export default function CreateProductPage() {
  const router = useRouter()

  const handleSubmit = async (data: ProductCreateForm) => {
    const result = await createProductAction(data)

    if (result.error) {
      toaster.error({ title: 'Ошибка', description: result.error })
      return
    }

    toaster.success({ title: 'Продукт создан' })
    router.push('/products')
  }

  return (
    <Form schema={ProductCreateFormSchema} initialValue={{ name: '', price: 0 }} onSubmit={handleSubmit}>
      <Form.AutoFields />
      <Form.Errors />
      <Form.Button.Submit>Создать</Form.Button.Submit>
    </Form>
  )
}
```

## Update паттерн

### Server Action

```typescript
// app/_actions/product.action.ts
export async function updateProductAction(id: string, data: unknown) {
  const parsed = UpdateProductSchema.safeParse(data)

  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  try {
    const db = await getDb()
    const product = await db.product.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath('/products')
    revalidatePath(`/products/${id}`)
    return { data: product }
  } catch (e) {
    return { error: 'Не удалось обновить продукт' }
  }
}
```

### Клиентский компонент

```tsx
export default function EditProductPage({ params }: { params: { id: string } }) {
  const { data: product, isLoading } = useFindUniqueProduct({
    where: { id: params.id },
  })

  if (isLoading) return <Spinner />
  if (!product) return <NotFound />

  const handleSubmit = async (data: ProductUpdateForm) => {
    const result = await updateProductAction(params.id, data)
    // ...
  }

  return (
    <Form schema={ProductUpdateFormSchema} initialValue={product} onSubmit={handleSubmit}>
      <Form.AutoFields />
      <Form.Button.Submit>Сохранить</Form.Button.Submit>
    </Form>
  )
}
```

## С ZenStack hooks (Form api prop)

```tsx
<Form
  api={{
    id: productId, // пустой = create, заполненный = update
    query: {
      hook: useFindUniqueProduct,
      include: { category: true },
    },
    mutations: {
      create: useCreateProduct,
      update: useUpdateProduct,
    },
  }}
  schema={ProductSchema}
  onSubmit={() => router.push('/products')}
>
  <Form.AutoFields />
  <Form.Errors />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

## Middleware паттерн

```tsx
<Form
  initialValue={data}
  onSubmit={handleSubmit}
  middleware={{
    beforeSubmit: async (data) => {
      // Трансформация или отмена
      if (!(await serverValidate(data))) return undefined
      return { ...data, timestamp: Date.now() }
    },
    afterSuccess: (data) => {
      toaster.success({ title: 'Сохранено!' })
      router.push('/list')
    },
    onError: (error) => {
      toaster.error({ title: error.message })
    },
  }}
>
```

## Правила

1. **Валидация на сервере** — всегда парси входные данные
2. **.strip()** — используй в Zod схемах для удаления лишних полей
3. **revalidatePath** — обновляй кэш после мутаций
4. **Структура возврата** — `{ data }` или `{ error }`
5. **Не используй form action** — вызывай Server Action напрямую из onSubmit

## Структура файлов

```
app/
├── _actions/
│   ├── product.action.ts
│   ├── order.action.ts
│   └── user.action.ts
├── _schemas/
│   ├── product.schema.ts
│   └── order.schema.ts
└── products/
    ├── page.tsx         # Список
    ├── create/
    │   └── page.tsx     # Создание
    └── [id]/
        └── edit/
            └── page.tsx # Редактирование
```
