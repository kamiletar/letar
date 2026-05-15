'use client'

import { Code, Heading, Image, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout } from '../_components'

const ContractSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Required')
      .meta({ ui: { title: 'Full Name' } }),
    signature: z.string().min(1, 'Signature is required'),
  })
  .strip()

export default function SignatureDemoPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout title="Signature Field" description="Form.Field.Signature — canvas drawing + typed mode">
      {/* Draw mode (по умолчанию) */}
      <VStack gap={4} align="stretch">
        <Heading size="lg">1. Draw + Typed Mode</Heading>
        <Text color="fg.muted">Рисуйте мышью/пальцем или введите имя для курсивной подписи.</Text>

        <Form initialValue={{ name: '', signature: '' }} schema={ContractSchema} onSubmit={(data) => setResult(data)}>
          <Form.Field.String name="name" label="Full Name" />
          <Form.Field.Signature name="signature" label="Your Signature" placeholder="Sign here" clearLabel="Clear" />
          <Form.Button.Submit>Sign Contract</Form.Button.Submit>
        </Form>
      </VStack>

      {/* Кастомные настройки */}
      <VStack gap={4} align="stretch" mt={8}>
        <Heading size="lg">2. Custom Style</Heading>
        <Text color="fg.muted">Синяя подпись, увеличенный canvas, толстая линия.</Text>

        <Form initialValue={{ signature: '' }} onSubmit={(data) => setResult(data)}>
          <Form.Field.Signature
            name="signature"
            label="Premium Signature"
            width={500}
            height={200}
            strokeColor="#1a365d"
            strokeWidth={3}
            backgroundColor="#f7fafc"
            placeholder="Sign with style"
          />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Form>
      </VStack>

      {/* Draw only (без typed mode) */}
      <VStack gap={4} align="stretch" mt={8}>
        <Heading size="lg">3. Draw Only (no typed)</Heading>

        <Form initialValue={{ signature: '' }} onSubmit={(data) => setResult(data)}>
          <Form.Field.Signature
            name="signature"
            label="Handwritten Only"
            allowTyped={false}
            placeholder="Draw your signature"
          />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Form>
      </VStack>

      {/* Результат */}
      {result && (
        <VStack gap={2} align="stretch" mt={8}>
          <Heading size="md">Submitted Data</Heading>
          {result.signature && typeof result.signature === 'string' && result.signature.startsWith('data:') && (
            <Image
              src={result.signature as string}
              alt="Signature"
              border="1px solid"
              borderColor="border"
              borderRadius="md"
              maxW="400px"
            />
          )}
          <Code whiteSpace="pre" maxH="200px" overflow="auto">
            {JSON.stringify(
              { ...result, signature: result.signature ? `${(result.signature as string).slice(0, 50)}...` : '' },
              null,
              2
            )}
          </Code>
        </VStack>
      )}
    </DemoPageLayout>
  )
}
