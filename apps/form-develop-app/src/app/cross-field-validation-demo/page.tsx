'use client'

import { type BookingCreateForm, BookingCreateFormSchema } from '@/generated/form-schemas/Booking.form'
import { Box, Code, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Демонстрация Фазы 2 миграции zenstack-form-plugin на нативные ZModel-возможности (v2.5.0).
 *
 * Схема ниже — не ручной Zod, а РЕАЛЬНО СГЕНЕРИРОВАННЫЙ `BookingCreateFormSchema`
 * (из `schema.zmodel` модели `Booking`, `nx zenstack:generate`). Кросс-полевая проверка
 * `endsAt > startsAt` объявлена в ZModel как `@@validate(endsAt > startsAt, "...", ["endsAt"])`
 * и рендерится в `.refine()` через `ZodUtils.addCustomValidation` — ручного `.refine()`
 * в этой странице нет ни строки.
 *
 * Попробуйте поставить дату окончания раньше даты начала — ошибка появится под полем `endsAt`
 * (третий аргумент `@@validate` — `path`), а не общей строкой формы.
 */
const initialValue: BookingCreateForm = {
  title: 'Бронирование переговорной',
  startsAt: new Date('2026-09-10T10:00:00'),
  endsAt: new Date('2026-09-10T11:00:00'),
}

export default function CrossFieldValidationDemoPage() {
  const [submittedData, setSubmittedData] = useState<BookingCreateForm | null>(null)

  const handleSubmit = (data: BookingCreateForm) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="Cross-Field Validation Demo (Фаза 2)"
      description="Zod-схема сгенерирована zenstack-form-plugin из @@validate(endsAt > startsAt, ...) в schema.zmodel — кросс-полевая проверка без единой строки ручного .refine()."
      maxW="700px"
    >
      <Form initialValue={initialValue} schema={BookingCreateFormSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          <Box>
            <Form.Field.String name="title" />
          </Box>

          <Box>
            <Form.Field.Date name="startsAt" />
          </Box>

          <Box>
            <Form.Field.Date name="endsAt" />
            <Code fontSize="xs" mt={1}>
              @@validate(endsAt &gt; startsAt, "Дата окончания раньше начала", ["endsAt"])
            </Code>
          </Box>

          <Form.Errors />
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </VStack>
      </Form>

      {submittedData && <SubmittedDataPreview data={submittedData} title="Отправленные данные:" />}
    </DemoPageLayout>
  )
}
