'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { editIntentValueSchema, emptyEditIntentValue } from '@letar/forms-core/edit-intent'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

// Симуляция серверной проверки — на настоящем бэкенде схема должна отдельно отклонять
// UI-маску как «новое» значение: клиентская схема не является security boundary.
const MASK_PATTERN = /^\*+/

const EditKeySchema = z
  .object({
    apiKey: editIntentValueSchema(
      z.string().min(20, 'Минимум 20 символов').refine((value) => !MASK_PATTERN.test(value), {
        message: 'Похоже на маску отображения, не на реальный ключ',
      }),
    ),
  })
  .strip()

const CreateSecretSchema = z
  .object({
    clientSecret: editIntentValueSchema(z.string().min(8, 'Минимум 8 символов')),
  })
  .strip()

export default function EditIntentDemoPage() {
  const [editResult, setEditResult] = useState<unknown>(null)
  const [createResult, setCreateResult] = useState<unknown>(null)

  return (
    <DemoPageLayout
      title="Form.Field.EditIntent"
      description="Явная замена значения без передачи старого клиенту (API key, Client Secret)"
    >
      <VStack gap={4} align="stretch">
        <Heading size="lg">1. Редактирование — ключ уже сохранён на сервере</Heading>
        <Text color="fg.muted">
          Сервер никогда не отдаёт настоящий ключ обратно — только безопасную маску. Клик «Заменить» переводит поле в
          edit mode и создаёт новое значение с нуля; «Оставить текущее» отменяет правку без изменений. При submit без
          правки уходит <Code>{'{ isEdited: false, value: null }'}</Code> — сервер значение не трогает.
        </Text>

        <Form
          initialValue={{ apiKey: emptyEditIntentValue<string>() }}
          schema={EditKeySchema}
          onSubmit={(data) => setEditResult(data)}
        >
          <Form.Field.EditIntent
            name="apiKey"
            displayValue="************P9x4"
            editLabel="Заменить ключ"
            cancelLabel="Оставить текущий"
            emptyValue=""
          >
            <Form.Field.Password name="apiKey.value" autoComplete="new-password" label="Новый ключ" />
          </Form.Field.EditIntent>
          <Box mt={4}>
            <Form.Button.Submit>Сохранить</Form.Button.Submit>
          </Box>
        </Form>

        <SubmittedDataPreview data={editResult} />
      </VStack>

      <VStack gap={4} align="stretch" mt={10}>
        <Heading size="lg">2. Создание — секрета ещё нет</Heading>
        <Text color="fg.muted">
          Create mode стартует сразу с <Code>{"{ isEdited: true, value: '' }"}</Code>{' '}
          — поле сразу открыто для ввода, кнопки «Заменить» нет смысла показывать.
        </Text>

        <Form
          initialValue={{ clientSecret: { isEdited: true, value: '' } }}
          schema={CreateSecretSchema}
          onSubmit={(data) => setCreateResult(data)}
        >
          <Form.Field.EditIntent name="clientSecret" displayValue="—" emptyValue="">
            <Form.Field.Password name="clientSecret.value" autoComplete="new-password" label="Client Secret" />
          </Form.Field.EditIntent>
          <Box mt={4}>
            <Form.Button.Submit>Создать</Form.Button.Submit>
          </Box>
        </Form>

        <SubmittedDataPreview data={createResult} />
      </VStack>
    </DemoPageLayout>
  )
}
