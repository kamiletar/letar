'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { createListCollection, Select, Stack } from '@chakra-ui/react'
import { useTypedFormContext } from '@letar/forms'
import { useStore } from '@tanstack/react-form'
import { type ProductFormData, ProductFormSchema } from '../_schemas/product-form.schema'

interface Category {
  id: string
  name: string
}

export type CreateProductResult = { success: true; redirect: string } | { success: false; error: string }

interface ProductFormProps {
  action: (data: ProductFormData) => Promise<CreateProductResult>
  defaultValue?: ProductFormData
  submitLabel?: string
  categories?: Category[]
}

/**
 * Переиспользуемый компонент формы для создания/редактирования Product.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function ProductForm({ action, defaultValue, submitLabel = 'Сохранить', categories = [] }: ProductFormProps) {
  const router = useRouter()

  const initialValue: ProductFormData = {
    name: defaultValue?.name || '',
    description: defaultValue?.description || '',
    gender: defaultValue?.gender || 'FEMALE',
    categoryId: defaultValue?.categoryId || '',
  }

  const handleSubmit = async (data: ProductFormData) => {
    const result = await action(data)

    if (result.success) {
      toaster.success({
        title: 'Успешно',
        description: 'Продукт сохранён',
      })
      router.push(result.redirect)
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <PremiumRosstilForm initialValue={initialValue} schema={ProductFormSchema} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <PremiumRosstilForm.Errors />

        <PremiumRosstilForm.Field.String
          name="name"
          label="Название продукта"
          placeholder="Введите название продукта"
          required
        />

        <PremiumRosstilForm.Field.Textarea
          name="description"
          label="Описание (опционально)"
          placeholder="Введите описание продукта"
          rows={4}
        />

        <PremiumRosstilForm.Select.Gender name="gender" label="Пол" />

        <CategorySelect categories={categories} />

        <PremiumRosstilForm.Button.Submit colorPalette="fg">{submitLabel}</PremiumRosstilForm.Button.Submit>
      </Stack>
    </PremiumRosstilForm>
  )
}

/**
 * Компонент выбора категории с интеграцией TanStack Form.
 */
function CategorySelect({ categories }: { categories: Category[] }) {
  const { form, setFieldValue } = useTypedFormContext<ProductFormData>()

  // Подписка на значение поля categoryId
  const value = useStore(form.store, (state) => (state as { values: ProductFormData }).values.categoryId)

  const categoryCollection = createListCollection({
    items: [{ value: '', label: 'Без категории' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
  })

  return (
    <Select.Root
      collection={categoryCollection}
      value={value ? [value] : ['']}
      onValueChange={({ value: newValue }) => setFieldValue('categoryId', newValue[0] || '')}
    >
      <Select.Label>Категория</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Выберите категорию" />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {categoryCollection.items.map((item) => (
            <Select.Item key={item.value} item={item}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}
