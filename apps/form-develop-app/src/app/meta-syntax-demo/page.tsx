'use client'

import {
  type MetaSyntaxDemoCreateForm,
  MetaSyntaxDemoCreateFormSchema,
} from '@/generated/form-schemas/MetaSyntaxDemo.form'
import { Box, Code, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Демонстрация Фазы 3→4 миграции zenstack-form-plugin (v3.0.0 → v4.0.0): `@meta("form.*", …)` —
 * единственный синтаксис, legacy comment-директивы `@form.*` убраны из парсера целиком в v4.0.0.
 *
 * Схема ниже — РЕАЛЬНО СГЕНЕРИРОВАННЫЙ `MetaSyntaxDemoCreateFormSchema` (модель `MetaSyntaxDemo`
 * в `schema.zmodel`).
 */
const initialValue: MetaSyntaxDemoCreateForm = {
  name: '',
  rating: 3,
  bio: '',
  legacyNote: '',
}

export default function MetaSyntaxDemoPage() {
  const [submittedData, setSubmittedData] = useState<MetaSyntaxDemoCreateForm | null>(null)

  const handleSubmit = (data: MetaSyntaxDemoCreateForm) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="Meta Syntax Demo (Фаза 3→4)"
      description="@meta('form.*', …) — единственный синтаксис (legacy @form.*-комментарии убраны в v4.0.0). Объектные литералы в @meta ломают zenstack generate целиком (ObjectExpr не поддержан upstream) — поэтому form.props.* задаётся плоским точечным путём, не объектом."
      maxW="800px"
    >
      <Form initialValue={initialValue} schema={MetaSyntaxDemoCreateFormSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          <Box>
            <Form.Field.String name="name" />
            <Code fontSize="xs" mt={1}>
              @meta("form.title", "Имя") @meta("form.placeholder", "Как вас зовут")
            </Code>
          </Box>

          <Box>
            <Form.Field.Number name="rating" />
            <Code fontSize="xs" mt={1}>
              @meta("form.fieldType", "rating") @meta("form.props.count", 5) @meta("form.props.allowHalf", true)
            </Code>
          </Box>

          <Box>
            <Form.Field.String name="bio" />
            <Code fontSize="xs" mt={1}>
              @meta("form.description", "Описание") @meta("form.fieldType", "textarea")
            </Code>
          </Box>

          <Box>
            <Form.Field.String name="legacyNote" />
            <Code fontSize="xs" mt={1}>
              @meta("form.title", "Заметка (раньше — legacy-синтаксис)") — до v4.0.0 это поле было на старом
              comment-синтаксисе @form.title(...)
            </Code>
          </Box>

          <Code fontSize="xs">
            поле `hidden` (@meta("form.exclude", true)) в форме отсутствует вовсе
          </Code>

          <Form.Errors />
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </VStack>
      </Form>

      {submittedData && <SubmittedDataPreview data={submittedData} title="Отправленные данные:" />}
    </DemoPageLayout>
  )
}
