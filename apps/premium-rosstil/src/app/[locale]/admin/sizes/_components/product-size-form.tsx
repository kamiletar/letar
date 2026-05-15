'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Fieldset, Grid, Heading, VStack } from '@chakra-ui/react'
import { type ProductSizeFormData, ProductSizeFormSchema } from '../_schemas/product-size-form.schema'

export type CreateProductSizeResult =
  | { success: true; redirect: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

interface ProductSizeFormProps {
  action: (data: ProductSizeFormData) => Promise<CreateProductSizeResult>
  defaultValue?: ProductSizeFormData
  submitLabel?: string
}

/**
 * Переиспользуемый компонент формы для создания/редактирования ProductSize.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 *
 * Форма включает:
 * - Выбор пола
 * - Международные коды размеров (RU, DE, IT, FR, UK, US, International)
 * - Диапазон размеров джинсов
 * - Измерения тела (грудь, талия, бёдра) с диапазонами min/max
 * - Порядок сортировки для отображения
 */
export function ProductSizeForm({ action, defaultValue, submitLabel = 'Сохранить' }: ProductSizeFormProps) {
  const router = useRouter()

  const initialValue: ProductSizeFormData = {
    gender: defaultValue?.gender || 'FEMALE',
    international: defaultValue?.international || '',
    ru: defaultValue?.ru || '',
    de: defaultValue?.de || '',
    it: defaultValue?.it || '',
    fr: defaultValue?.fr || '',
    uk: defaultValue?.uk || '',
    us: defaultValue?.us || '',
    jeansFrom: defaultValue?.jeansFrom || '',
    jeansTo: defaultValue?.jeansTo || '',
    bustMin: defaultValue?.bustMin ?? 0,
    bustMax: defaultValue?.bustMax ?? 0,
    waistMin: defaultValue?.waistMin ?? 0,
    waistMax: defaultValue?.waistMax ?? 0,
    hipsMin: defaultValue?.hipsMin ?? 0,
    hipsMax: defaultValue?.hipsMax ?? 0,
    sortOrder: defaultValue?.sortOrder ?? 0,
  }

  const handleSubmit = async (data: ProductSizeFormData) => {
    const result = await action(data)

    if (result.success) {
      toaster.success({
        title: 'Успешно',
        description: 'Размер сохранён',
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
    <PremiumRosstilForm initialValue={initialValue} schema={ProductSizeFormSchema} onSubmit={handleSubmit}>
      <VStack gap={6} align="stretch">
        <PremiumRosstilForm.Errors />

        {/* Выбор пола */}
        <PremiumRosstilForm.Select.Gender name="gender" label="Пол" />

        {/* Международные коды размеров */}
        <Fieldset.Root>
          <Fieldset.Legend>
            <Heading size="md" textTransform="none">
              Международные размеры
            </Heading>
          </Fieldset.Legend>
          <Fieldset.Content>
            <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
              <PremiumRosstilForm.Field.String
                name="international"
                label="Международный"
                placeholder="XS, S, M, L, XL"
                required
              />
              <PremiumRosstilForm.Field.String name="ru" label="RU" placeholder="40, 42, 44" required />
              <PremiumRosstilForm.Field.String name="de" label="DE" placeholder="32, 34, 36" required />
              <PremiumRosstilForm.Field.String name="it" label="IT" placeholder="36, 38, 40" required />
              <PremiumRosstilForm.Field.String name="fr" label="FR" placeholder="32, 34, 36" required />
              <PremiumRosstilForm.Field.String name="uk" label="UK" placeholder="4, 6, 8" required />
              <PremiumRosstilForm.Field.String name="us" label="US" placeholder="0, 2, 4" required />
            </Grid>
          </Fieldset.Content>
        </Fieldset.Root>

        {/* Диапазон размеров джинсов */}
        <Fieldset.Root>
          <Fieldset.Legend>
            <Heading size="md" textTransform="none">
              Размер джинсов
            </Heading>
          </Fieldset.Legend>
          <Fieldset.Content>
            <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
              <PremiumRosstilForm.Field.String name="jeansFrom" label="От" placeholder="24, 26, 28" required />
              <PremiumRosstilForm.Field.String name="jeansTo" label="До" placeholder="25, 27, 29" required />
            </Grid>
          </Fieldset.Content>
        </Fieldset.Root>

        {/* Измерения тела */}
        <Fieldset.Root>
          <Fieldset.Legend>
            <Heading size="md" textTransform="none">
              Измерения (см)
            </Heading>
          </Fieldset.Legend>
          <Fieldset.Content>
            <VStack gap={4} align="stretch">
              {/* Обхват груди */}
              <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                <PremiumRosstilForm.Field.Number
                  name="bustMin"
                  label="Обхват груди (от)"
                  placeholder="76"
                  min={0}
                  required
                />
                <PremiumRosstilForm.Field.Number
                  name="bustMax"
                  label="Обхват груди (до)"
                  placeholder="80"
                  min={0}
                  required
                />
              </Grid>

              {/* Обхват талии */}
              <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                <PremiumRosstilForm.Field.Number
                  name="waistMin"
                  label="Обхват талии (от)"
                  placeholder="58"
                  min={0}
                  required
                />
                <PremiumRosstilForm.Field.Number
                  name="waistMax"
                  label="Обхват талии (до)"
                  placeholder="62"
                  min={0}
                  required
                />
              </Grid>

              {/* Обхват бёдер */}
              <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                <PremiumRosstilForm.Field.Number
                  name="hipsMin"
                  label="Обхват бёдер (от)"
                  placeholder="84"
                  min={0}
                  required
                />
                <PremiumRosstilForm.Field.Number
                  name="hipsMax"
                  label="Обхват бёдер (до)"
                  placeholder="88"
                  min={0}
                  required
                />
              </Grid>
            </VStack>
          </Fieldset.Content>
        </Fieldset.Root>

        {/* Порядок сортировки */}
        <PremiumRosstilForm.Field.Number
          name="sortOrder"
          label="Порядок сортировки"
          placeholder="0"
          min={0}
          helperText="Используется для сортировки размеров при отображении (меньшее значение = выше в списке)"
        />

        {/* Кнопка отправки */}
        <PremiumRosstilForm.Button.Submit colorPalette="fg" size="lg">
          {submitLabel}
        </PremiumRosstilForm.Button.Submit>
      </VStack>
    </PremiumRosstilForm>
  )
}
