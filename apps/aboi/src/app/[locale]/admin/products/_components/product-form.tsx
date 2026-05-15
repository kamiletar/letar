'use client'

import { AboiForm } from '@/aboi-form'
import { ProductCreateFormSchema } from '@/generated/form-schemas'
import { Box } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { z } from 'zod/v4'
import { createProductAction, updateProductAction } from '../../_actions/products.action'

const FormSchema = ProductCreateFormSchema.omit({ deletedAt: true, affirmations: true })
  .extend({
    // В форме — рубли, в action конвертируем × 100 в копейки
    pricePerMeter: z
      .number()
      .min(1)
      .meta({ ui: { title: 'Цена за пог. метр, ₽', placeholder: '1500' } }),
    // Строка вместо массива — парсится при сабмите
    affirmationsRaw: z
      .string()
      .meta({ ui: { title: 'Аффирмации (через запятую)', placeholder: 'здоровье, сила, гармония' } }),
  })
  .strip()

type FormValue = z.infer<typeof FormSchema>

interface Props {
  mode: 'create' | 'edit'
  productId?: string
  defaults?: {
    name?: string
    slug?: string
    description?: string | null
    pricePerMeter?: number
    minLengthMeters?: number
    affirmations?: string[]
    published?: boolean
  }
}

export function ProductForm({ mode, productId, defaults }: Props) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const initialValue: FormValue = {
    name: defaults?.name ?? '',
    slug: defaults?.slug ?? '',
    description: defaults?.description ?? '',
    // Хранится в копейках → показываем в рублях
    pricePerMeter: defaults?.pricePerMeter !== undefined ? Math.round(defaults.pricePerMeter / 100) : 1500,
    minLengthMeters: defaults?.minLengthMeters ?? 1,
    affirmationsRaw: (defaults?.affirmations ?? []).join(', '),
    published: defaults?.published ?? false,
  }

  return (
    <Box>
      {submitError && (
        <Box bg="red.subtle" color="red.fg" p={3} borderRadius="md" fontSize="sm" mb={4}>
          {submitError}
        </Box>
      )}
      <AboiForm
        schema={FormSchema}
        initialValue={initialValue}
        onSubmit={async (value) => {
          setSubmitError(null)
          const payload = {
            name: value.name,
            slug: value.slug?.trim() || undefined,
            description: value.description ? value.description.trim() || undefined : undefined,
            pricePerMeter: Math.round(value.pricePerMeter * 100), // рубли → копейки
            minLengthMeters: value.minLengthMeters,
            affirmations: value.affirmationsRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            published: value.published,
          }

          if (mode === 'create') {
            const result = await createProductAction(payload)
            if (!result.ok) {
              setSubmitError(result.error ?? 'Не удалось создать товар')
              return
            }
            if (result.data) {
              router.push(`/admin/products/${result.data.id}`)
              router.refresh()
            }
          } else {
            const result = await updateProductAction(productId!, payload)
            if (!result.ok) {
              setSubmitError(result.error ?? 'Не удалось сохранить')
              return
            }
            router.refresh()
          }
        }}
      >
        <AboiForm.Field.String name="name" required />
        <AboiForm.Field.String name="slug" />
        <AboiForm.Field.Textarea name="description" rows={5} />
        <AboiForm.Field.Number name="pricePerMeter" required />
        <AboiForm.Field.Number name="minLengthMeters" required />
        <AboiForm.Field.String name="affirmationsRaw" />
        <AboiForm.Field.Checkbox name="published" label="Опубликован (виден в каталоге)" />
        <AboiForm.Errors />
        <AboiForm.Button.Submit>{mode === 'create' ? 'Создать товар' : 'Сохранить'}</AboiForm.Button.Submit>
      </AboiForm>
    </Box>
  )
}
