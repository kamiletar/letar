# Админ-панель и CRUD паттерны

⚠️ **Основной эталон документа — несуществующее приложение (найдено 2026-08-12, не исправлено).**
Все 4 ссылки «Эталон: `apps/premium-rosstil/...`» в этом файле (управление размерами,
тестовыми моделями, drag-and-drop сортировка, копирование записи) указывают на приложение,
удалённое из монорепо 2026-07-05 — `apps/premium-rosstil` физически не существует. Раздел
«Эталонные примеры» в конце файла (`/admin/test-models`, `/admin/sizes`, `/admin/products`)
описывает те же три экрана без явного пути, но по терминологии (`ProductVariant`, `ProductItem`,
`VariantImage`) это тот же самый удалённый пример.

Сами **паттерны** (файловая структура, серверные экшены, dnd-kit для сортировки, копирование
записи, валидация min/max) технически универсальны и, вероятно, остаются корректными
методическими примерами — но ни один конкретный путь к файлу, процитированный в этом документе,
не резолвится. Живой замены с эквивалентным набором фич (variants + sizes + dnd-kit сортировка

- копирование) в этой сессии не нашла — `apps/aboi/.../product-image-manager.tsx` и
  драг-дроп-сортировщики фото в `driving-school`/`domwellbes`/`aprel8008` решают только сортировку
  изображений, не полный набор паттернов ниже. Нужен отдельный проход — либо найти более полное
  соответствие, либо переписать примеры под текущее живое приложение.

## Обзор

Админ-панель (`/admin`) включает несколько интерфейсов управления с разным уровнем функциональности.

**Доступ:** Только роль ADMIN (контролируется middleware в `src/proxy.ts`)

## Функции админки

### Управление товарами (`/admin/products`)

**Полный CRUD** - Создание, чтение, обновление, удаление товаров, вариантов и позиций

**Функции:**

- Управление товарами с вариантами (цвет, состав)
- Товарные позиции (размер + цена + остаток)
- Загрузка и перетаскивание изображений с drag-and-drop
- Выбор размеров
- Удаление с проверкой использования
- 15+ экшенов для полного жизненного цикла товара

**Задействованные модели:**

- Product (основная сущность)
- ProductVariant (вариации по цвету/составу)
- ProductItem (размер + цена + остаток для каждого варианта)
- VariantImage (изображения для каждого варианта)
- ProductSize (размерная сетка)

### Управление пользователями (`/admin/users`)

**Полный CRUD** - Создание, чтение, обновление, удаление пользователей

**Функции:**

- Управление ролями (USER ↔ ADMIN)
- Редактирование профиля пользователя с OAuth данными
- Просмотр привязанных OAuth аккаунтов

**Задействованные модели:**

- User
- Account (OAuth привязки)

### Управление размерами (`/admin/sizes`)

**Полный CRUD с продвинутыми функциями**

**Функции:**

- **Drag-and-drop сортировка** с использованием dnd-kit
- Кастомный порядок сортировки сохраняется в БД
- Валидация: мерки min < max, уникальность (ru, gender)
- Размерные сетки по полу (MALE/FEMALE)
- Функция копирования размера для быстрого дублирования
- Международные стандарты размеров (RU, DE, IT, FR, UK, US, International, Jeans)

**Эталон:** `apps/premium-rosstil/src/app/admin/sizes/`

**Задействованные модели:**

- ProductSize

### Управление тестовыми моделями (`/admin/test-models`)

**⭐ ЭТАЛОННАЯ РЕАЛИЗАЦИЯ для CRUD паттернов админки**

**Функции:**

- Демонстрирует лучшие практики для @letar/forms + Zod v4
- Полный CRUD с правильной обработкой ошибок
- **Используй как шаблон** для новых функций админки

**Эталон:** `apps/premium-rosstil/src/app/admin/test-models/`

**Задействованные модели:**

- TestModel

## CRUD паттерн (Эталон: `/admin/test-models`)

### 1. Файловая структура

При создании новых CRUD функций админки следуй **этой точной структуре**:

```
admin/entity/
├── _schemas/
│   └── entity-form.schema.ts       # Кастомная схема с .strip()
├── _components/
│   └── entity-form.tsx             # Переиспользуемый компонент формы
├── page.tsx                        # Страница списка с таблицей/сеткой
├── new/
│   ├── page.tsx                    # Страница создания
│   └── _actions/
│       └── create-entity.ts        # Серверный экшен создания
└── [id]/edit/
    ├── page.tsx                    # Страница редактирования
    └── _actions/
        └── update-entity.ts        # Серверный экшен обновления
```

### 2. Паттерн схемы

**КРИТИЧНО:** Всегда используй `.strip()` для удаления полей React Server Actions:

```typescript
import { GenderSchema } from '@/generated/zod/enums/Gender.schema'
import { z } from 'zod/v4'

/**
 * Кастомная схема для форм Entity.
 * Использует .strip() для удаления полей React Server Actions.
 */
export const EntityFormSchema = z
  .object({
    text: z.string().min(1, 'Поле обязательно для заполнения'),
    gender: GenderSchema,
  })
  .strip() // ← КРИТИЧНО для Conform Future API

export type EntityFormData = z.infer<typeof EntityFormSchema>
```

### 3. Компонент формы

Один **переиспользуемый компонент** для создания/редактирования:

**Пропсы:**

- `action` - Серверный экшен (создание или обновление)
- `defaultValue` - Начальные данные для режима редактирования
- `submitLabel` - Текст кнопки ("Создать" или "Сохранить")

**Паттерн (@letar/forms — рекомендуется):**

```typescript
'use client'

import { Button, Input } from '@chakra-ui/react'
import { ChakraFormField, TanStackFormField, useAppForm } from '@letar/forms'

export function EntityForm({ action, defaultValue, submitLabel = 'Сохранить' }) {
  const form = useAppForm({
    defaultValues: defaultValue ?? { text: '', gender: '' },
    validators: { onChange: EntityFormSchema },
    onSubmit: async ({ value }) => {
      const result = await action(value)
      if (result?.success) {
        toaster.success({ title: 'Сохранено' })
      }
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="text">
        {(field) => (
          <TanStackFormField name="text" field={field}>
            <ChakraFormField label="Текст" required>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </ChakraFormField>
          </TanStackFormField>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" colorPalette="fg" loading={isSubmitting}>
            {submitLabel}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
```

### 4. Серверные экшены

**@letar/forms вызывает экшены напрямую из onSubmit**, поэтому Server Actions проще:

```typescript
'use server'

import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

// Server Action принимает уже провалидированные данные
export async function createEntity(data: EntityFormData) {
  // 1. Аутентификация (Better Auth)
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // 2. Операция с базой данных
  const db = getEnhancedPrisma(session.user)

  try {
    await db.entity.create({
      data,
    })
  } catch (error) {
    console.error('Failed to create:', error)

    // Обработка нарушения уникального ограничения (P2002)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Запись уже существует' }
    }

    return { success: false, error: 'Не удалось создать запись' }
  }

  // 3. Инвалидация кэша и редирект
  revalidatePath('/admin/entities')
  redirect('/admin/entities')
}
```

**Для экшенов обновления** - привязка ID через `.bind()`:

```typescript
export async function updateEntity(id: string, prevState: unknown, formData: FormData) {
  // ... та же структура, но используй:
  await db.entity.update({
    where: { id },
    data: result.value,
  })
}

// На странице редактирования:
const updateAction = updateEntity.bind(null, id)
```

### 5. Страница списка

Отображение всех записей со ссылками на создание/редактирование:

```typescript
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Button, Table } from '@chakra-ui/react'
import { headers } from 'next/headers'
import Link from 'next/link'

export default async function EntityListPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  const db = getEnhancedPrisma(session.user)
  const entities = await db.entity.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <Container>
      <Heading>Entities</Heading>

      <Button asChild colorPalette="fg">
        <Link href="/admin/entities/new">Создать</Link>
      </Button>

      <Table.Root>
        <Table.Body>
          {entities.map((entity) => (
            <Table.Row key={entity.id}>
              <Table.Cell>{entity.text}</Table.Cell>
              <Table.Cell>
                <Button asChild size="sm" variant="outline" colorPalette="fg">
                  <Link href={`/admin/entities/${entity.id}/edit`}>Редактировать</Link>
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Container>
  )
}
```

### 6. Страница создания

```typescript
import { EntityForm } from '../_components/entity-form'
import { createEntity } from './_actions/create-entity'

export default async function NewEntityPage() {
  // Проверки авторизации...

  return (
    <Container>
      <Heading>Создать Entity</Heading>
      <EntityForm action={createEntity} submitLabel="Создать" />
    </Container>
  )
}
```

### 7. Страница редактирования

```typescript
import { EntityForm } from '../../_components/entity-form'
import { updateEntity } from './_actions/update-entity'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditEntityPage({ params }: PageProps) {
  // Проверки авторизации...

  const { id } = await params // ← асинхронные params в Next.js 16
  const db = getEnhancedPrisma(session.user)
  const entity = await db.entity.findUnique({ where: { id } })

  if (!entity) { notFound() }

  const updateAction = updateEntity.bind(null, id)

  return (
    <Container>
      <Heading>Редактировать Entity</Heading>
      <EntityForm
        action={updateAction}
        defaultValue={{ text: entity.text, gender: entity.gender }}
        submitLabel="Сохранить"
      />
    </Container>
  )
}
```

## Продвинутые функции

### Drag-and-Drop сортировка (dnd-kit)

**Пример:** `/admin/sizes` с сортируемым списком размеров

**Установка:**

```bash
bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Паттерн:**

1. Добавь поле `sortOrder` в модель (integer)
2. Используй обёртки `DndContext` + `SortableContext`
3. Создай компонент `SortableItem` с хуком `useSortable`
4. Обработай событие `onDragEnd` для обновления порядка сортировки
5. Серверный экшен для сохранения нового порядка в БД

**Эталон:** `apps/premium-rosstil/src/app/admin/sizes/page.tsx`

### Функция копирования/дублирования

**Паттерн:**

1. Добавь кнопку "Копировать" рядом с каждым элементом
2. Серверный экшен, который:
   - Читает оригинальную запись
   - Создаёт новую запись с изменёнными данными (новый ID, уникальные поля)
   - Редиректит на страницу редактирования новой записи

**Эталон:** `apps/premium-rosstil/src/app/admin/sizes/`

### Валидация бизнес-логики

Помимо валидации Zod схемы, добавляй **бизнес-правила** в серверный экшен:

```typescript
// Пример: Валидация min < max
if (data.bustMin >= data.bustMax) {
  return { success: false, error: 'Минимум должен быть меньше максимума' }
}

// Пример: Проверка уникальности
const existing = await db.entity.findFirst({
  where: {
    ru: data.ru,
    gender: data.gender,
  },
})

if (existing) {
  return { success: false, error: 'Размер уже существует для этого пола' }
}
```

### Удаление с проверкой использования

Перед удалением проверяй, используется ли сущность где-то ещё:

```typescript
export async function deleteEntity(id: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  // Проверка на ссылки
  const itemsUsingSize = await db.productItem.count({
    where: { sizeId: id },
  })

  if (itemsUsingSize > 0) {
    throw new Error(`Размер используется в ${itemsUsingSize} товарах`)
  }

  await db.entity.delete({ where: { id } })
  revalidatePath('/admin/entities')
  redirect('/admin/entities')
}
```

## Типовые паттерны

### Проверка аутентификации (Better Auth)

На каждой странице админки и в серверных экшенах:

```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({ headers: await headers() })
if (!session?.user || session.user.role !== 'ADMIN') {
  throw new Error('Unauthorized') // или redirect('/sign-in')
}
```

### Enhanced Prisma клиент

Всегда используй enhanced клиент с сессией:

```typescript
const db = getEnhancedPrisma(session.user)
```

### Инвалидация кэша

После мутаций инвалидируй кэш:

```typescript
import { revalidatePath } from 'next/cache'

// После создания/обновления/удаления
revalidatePath('/admin/entities')
revalidatePath(`/admin/entities/${id}/edit`)
```

### Обработка ошибок

```typescript
try {
  await db.entity.create({ data })
} catch (error) {
  console.error('Failed to create:', error)

  // Нарушение уникального ограничения Prisma
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    return { success: false, error: 'Запись уже существует' }
  }

  // Общая ошибка
  return { success: false, error: 'Не удалось создать запись' }
}
```

### Toast уведомления

Используй Chakra UI Toaster для обратной связи:

```typescript
import { toaster } from '@/app/_components/ui/toaster'

toaster.success({ title: 'Успех', description: 'Запись создана' })
toaster.error({ title: 'Ошибка', description: 'Не удалось создать' })
```

## Ключевые преимущества

✅ **Единообразные паттерны** по всем функциям админки
✅ **Типобезопасность** с TypeScript и Zod
✅ **Переиспользуемые компоненты** (одна форма для создания/редактирования)
✅ **Правильная обработка ошибок** с понятными сообщениями
✅ **Row-level безопасность** через Enhanced Prisma клиент
✅ **Инвалидация кэша** для свежих данных
✅ **Ролевой доступ** контролируется на нескольких уровнях

## Эталонные примеры

**Лучшие примеры в кодовой базе:**

- **Базовый CRUD:** `/admin/test-models` - Эталонная реализация
- **Продвинутые функции:** `/admin/sizes` - Drag-drop, копирование, валидация
- **Сложный CRUD:** `/admin/products` - Многоуровневые сущности, изображения, варианты

## Устранение неполадок

**Ошибки валидации формы не отображаются**

- Проверь, что используется `@letar/forms` с `ChakraFormField`
- Убедись, что схема использует `.strip()`

**Изменения не отражаются в UI**

- Отсутствует `revalidatePath()` после мутации
- Проверь инвалидацию кэша для правильных путей

**Ошибки отказа в доступе**

- Проверь проверку роли: `session.user.role !== 'ADMIN'`
- Используй Enhanced Prisma клиент: `getEnhancedPrisma(session.user)`

**Нарушения уникального ограничения Prisma**

- Обрабатывай код ошибки P2002 в try/catch
- Возвращай `{ success: false, error: 'message' }`
