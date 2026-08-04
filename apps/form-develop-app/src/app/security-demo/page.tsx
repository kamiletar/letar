'use client'

import { Code, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout } from '../_components'

const ContactSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Required')
      .meta({ ui: { title: 'Name' } }),
    email: z
      .string()
      .email()
      .meta({ ui: { title: 'Email' } }),
    message: z
      .string()
      .min(10, 'Min 10 characters')
      .meta({ ui: { title: 'Message' } }),
  })
  .strip()

export default function SecurityDemoPage() {
  const [result, setResult] = useState<string | null>(null)
  const [fileResult, setFileResult] = useState<string | null>(null)

  return (
    <DemoPageLayout title="Security Patterns" description="Honeypot, Rate Limiting, Secure File Upload">
      {/* Honeypot */}
      <VStack gap={4} align="stretch">
        <Heading size="lg">1. Honeypot — ловушка для ботов</Heading>
        <Text color="fg.muted">Скрытое поле невидимо для людей. Боты заполняют все поля — submit блокируется.</Text>

        <Form
          initialValue={{ name: '', email: '', message: '' }}
          schema={ContactSchema}
          honeypot={true}
          onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}
        >
          <Form.Field.String name="name" />
          <Form.Field.String name="email" />
          <Form.Field.Textarea name="message" />
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </Form>

        {result && <Code whiteSpace="pre">{result}</Code>}
      </VStack>

      {/* Rate Limiting */}
      <VStack gap={4} align="stretch" mt={8}>
        <Heading size="lg">2. Rate Limiting — ограничение попыток</Heading>
        <Text color="fg.muted">Максимум 3 попытки submit за 60 секунд. После — обратный отсчёт.</Text>

        <Form
          initialValue={{ name: '', email: '', message: '' }}
          schema={ContactSchema}
          rateLimit={{ maxSubmits: 3, windowMs: 60000 }}
          onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}
        >
          <Form.Field.String name="name" />
          <Form.Field.String name="email" />
          <Form.Field.Textarea name="message" />
          <Form.Button.Submit>Отправить (макс. 3 раза/мин)</Form.Button.Submit>
        </Form>
      </VStack>

      {/* Secure File Upload */}
      <VStack gap={4} align="stretch" mt={8}>
        <Heading size="lg">3. Secure File Upload</Heading>
        <Text color="fg.muted">Проверка MIME по magic bytes, удаление EXIF, переименование в UUID.</Text>

        <Form
          initialValue={{ document: [] }}
          onSubmit={(data) => {
            const files = data.document as File[]
            setFileResult(files.map((f: File) => `${f.name} (${f.type}, ${f.size} bytes)`).join(', '))
          }}
        >
          <Form.Field.FileUpload
            name="document"
            label="Загрузите документ"
            variant="dropzone"
            accept={['image/jpeg', 'image/png', 'application/pdf']}
            security={{
              maxSize: '10MB',
              allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
              stripMetadata: true,
              renameFile: true,
            }}
          />
          <Form.Button.Submit>Загрузить</Form.Button.Submit>
        </Form>

        {fileResult && <Code whiteSpace="pre">{fileResult}</Code>}
      </VStack>
    </DemoPageLayout>
  )
}
