'use client'

import { type RecipeCreateForm, RecipeCreateFormSchema } from '@/generated/form-schemas/Recipe.form'
import { Box, Code, Heading, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Демонстрация Фазы 1 миграции zenstack-form-plugin на нативные ZModel-атрибуты (A3).
 *
 * Схема ниже — не ручной Zod, а РЕАЛЬНО СГЕНЕРИРОВАННЫЙ `RecipeCreateFormSchema`
 * (из `schema.zmodel` модели `Recipe`, `nx zenstack:generate`). Поля `slug`/`website`/
 * `authorPhone`/`publishedOn` не содержат ни одной строчки ручной валидации — вся клиентская
 * валидация наследована из нативных атрибутов ZModel через `ZodUtils.*` (см. `libs/forms/PLAN.md`,
 * `libs/zenstack-form-plugin/CHANGELOG.md` v2.4.0).
 */
const initialValue: RecipeCreateForm = {
  title: 'Борщ',
  portions: 4,
  tags: ['суп', 'горячее'],
  slug: 'recipe-borsch',
  website: undefined,
  authorPhone: undefined,
  publishedOn: undefined,
}

export default function NativeAttributesDemoPage() {
  const [submittedData, setSubmittedData] = useState<RecipeCreateForm | null>(null)

  const handleSubmit = (data: RecipeCreateForm) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="Native Attributes Demo (Фаза 1)"
      description="Zod-схема сгенерирована zenstack-form-plugin из @gte/@startsWith/@url/@phone/@date/@trim/@lower в schema.zmodel — не написана вручную. Источник валидации один: и ORM, и форма."
      maxW="800px"
    >
      <Form initialValue={initialValue} schema={RecipeCreateFormSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          <Box>
            <Form.Field.String name="title" />
            <Code fontSize="xs" mt={1}>
              обычное поле, без нативных атрибутов
            </Code>
          </Box>

          <Box>
            <Form.Field.Number name="portions" />
            <Code fontSize="xs" mt={1}>
              @gte(1) @lte(100) → .min(1).max(100)
            </Code>
          </Box>

          <Box>
            <Form.Field.String name="slug" />
            <Code fontSize="xs" mt={1}>
              @startsWith("recipe-") @trim() @lower() → withNative(ZodUtils.addStringValidation)
            </Code>
          </Box>

          <Box>
            <Form.Field.String name="website" />
            <Code fontSize="xs" mt={1}>
              @url() → withNative(ZodUtils.addStringValidation)
            </Code>
          </Box>

          <Box>
            <Form.Field.String name="authorPhone" />
            <Code fontSize="xs" mt={1}>
              @phone() → withNative(ZodUtils.addStringValidation)
            </Code>
          </Box>

          <Box>
            <Form.Field.String name="publishedOn" />
            <Code fontSize="xs" mt={1}>
              @date() → withNative(ZodUtils.addStringValidation)
            </Code>
          </Box>

          <Heading size="sm" mt={2}>
            internalNote и totalWeightGrams в форме не отображаются
          </Heading>
          <Code fontSize="xs">
            @omit() / @computed() исключают поле из RecipeExcludedFields — форма их даже не получает
          </Code>

          <Form.Errors />
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </VStack>
      </Form>

      {submittedData && <SubmittedDataPreview data={submittedData} title="Отправленные данные:" />}
    </DemoPageLayout>
  )
}
