'use client'

import { ChakraProvider, Code, defaultSystem, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const ContactSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Name' } }),
    email: z
      .string()
      .email()
      .meta({ ui: { title: 'Email' } }),
    message: z
      .string()
      .min(10)
      .meta({ ui: { title: 'Message' } }),
  })
  .strip()

export default function SecurityDemoPage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Stack gap={8} p={8} maxW="3xl" mx="auto">
        <Heading size="2xl">Security Patterns Demo</Heading>

        {/* Honeypot */}
        <Stack gap={4}>
          <Heading size="lg">Honeypot — Bot Trap</Heading>
          <Text color="fg.muted">Hidden field catches bots. Real users never see it.</Text>
          <Form
            initialValue={{ name: '', email: '', message: '' }}
            schema={ContactSchema}
            honeypot={true}
            onSubmit={(data) => setResult(`Honeypot: ${JSON.stringify(data, null, 2)}`)}
          >
            <Form.Field.String name="name" />
            <Form.Field.String name="email" />
            <Form.Field.Textarea name="message" />
            <Form.Button.Submit>Send (honeypot protected)</Form.Button.Submit>
          </Form>
        </Stack>

        {/* Rate Limit */}
        <Stack gap={4}>
          <Heading size="lg">Rate Limiting</Heading>
          <Text color="fg.muted">Max 3 submits per minute. Try clicking rapidly.</Text>
          <Form
            initialValue={{ name: '', email: '', message: '' }}
            schema={ContactSchema}
            rateLimit={{ maxSubmits: 3, windowMs: 60000 }}
            onSubmit={(data) => setResult(`Rate limit: ${JSON.stringify(data, null, 2)}`)}
          >
            <Form.Field.String name="name" />
            <Form.Field.String name="email" />
            <Form.Field.Textarea name="message" />
            <Form.Button.Submit>Send (rate limited)</Form.Button.Submit>
          </Form>
        </Stack>

        {/* Secure Upload */}
        <Stack gap={4}>
          <Heading size="lg">Secure File Upload</Heading>
          <Text color="fg.muted">MIME check via magic bytes, EXIF stripping, UUID rename.</Text>
          <Form
            initialValue={{ document: [] }}
            onSubmit={(data) => {
              const files = data.document as File[]
              setResult(`Files: ${files.map((f) => `${f.name} (${f.type})`).join(', ')}`)
            }}
          >
            <Form.Field.FileUpload
              name="document"
              label="Upload Document"
              variant="dropzone"
              security={{
                maxSize: '5MB',
                allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
                stripMetadata: true,
                renameFile: true,
              }}
            />
            <Form.Button.Submit>Upload</Form.Button.Submit>
          </Form>
        </Stack>

        {result && (
          <Code whiteSpace="pre" p={4}>
            {result}
          </Code>
        )}
      </Stack>
    </ChakraProvider>
  )
}
