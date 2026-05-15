'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Box, Button, Stack, VStack } from '@chakra-ui/react'
import { type CategoryFormData, CategoryFormSchema } from '../_schemas/category-form.schema'

export type CreateCategoryResult = { success: true; redirect: string } | { success: false; error: string }

interface CategoryFormProps {
  action: (data: CategoryFormData) => Promise<CreateCategoryResult>
  defaultValue?: CategoryFormData
  submitLabel?: string
}

/**
 * Переиспользуемая форма категории.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function CategoryForm({ action, defaultValue, submitLabel = 'Создать' }: CategoryFormProps) {
  const router = useRouter()

  const initialValue: CategoryFormData = {
    name: defaultValue?.name || '',
    slug: defaultValue?.slug || '',
    sortOrder: defaultValue?.sortOrder ?? 0,
  }

  const handleSubmit = async (data: CategoryFormData) => {
    const result = await action(data)

    if (result.success) {
      toaster.success({
        title: 'Успешно',
        description: 'Категория сохранена',
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
    <PremiumRosstilForm initialValue={initialValue} schema={CategoryFormSchema} onSubmit={handleSubmit}>
      <VStack gap={6} align="stretch">
        <PremiumRosstilForm.Errors />

        <Stack direction={{ base: 'column', md: 'row' }} gap={4}>
          <Box flex={1}>
            <PremiumRosstilForm.Field.String name="name" label="Название" placeholder="Платья" required />
          </Box>
          <Box flex={1}>
            <PremiumRosstilForm.Field.String
              name="slug"
              label="Slug (URL)"
              placeholder="dresses"
              helperText="Латинские буквы, цифры и дефисы"
              required
            />
          </Box>
          <Box width={{ base: 'full', md: '150px' }}>
            <PremiumRosstilForm.Field.Number name="sortOrder" label="Порядок" min={0} />
          </Box>
        </Stack>

        <Button type="submit" colorPalette="fg" alignSelf="flex-start">
          {submitLabel}
        </Button>
      </VStack>
    </PremiumRosstilForm>
  )
}
