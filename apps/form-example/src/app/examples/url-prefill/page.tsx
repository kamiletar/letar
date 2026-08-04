'use client'

import { Box, Code, Heading, Link, Stack, Text, VStack } from '@chakra-ui/react'
import { Form, useUrlPrefill } from '@letar/forms'
import NextLink from 'next/link'
import { z } from 'zod/v4'

const ContactSchema = z.object({
  name: z
    .string()
    .min(1)
    .meta({ ui: { title: 'Имя', placeholder: 'Как вас зовут?' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'user@example.com' } }),
  phone: z
    .string()
    .optional()
    .meta({ ui: { title: 'Телефон' } }),
})

function PrefillForm() {
  const prefilled = useUrlPrefill({
    fields: ['name', 'email', 'phone'],
    cleanUrl: false,
  })

  return (
    <Form
      schema={ContactSchema}
      initialValue={{ name: '', email: '', phone: '', ...prefilled }}
      onSubmit={async (data) => {
        alert(JSON.stringify(data, null, 2))
      }}
    >
      <Form.Field.String name="name" />
      <Form.Field.String name="email" />
      <Form.Field.Phone name="phone" />
      <Form.Button.Submit>Отправить</Form.Button.Submit>
    </Form>
  )
}

export default function UrlPrefillExamplePage() {
  return (
    <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
      <Box>
        <Heading size="lg">URL Prefill</Heading>
        <Text color="fg.muted" mt={2}>
          Автозаполнение полей формы из URL-параметров. Whitelist обязателен для безопасности.
        </Text>
      </Box>

      <PrefillForm />

      <Box p={6} borderWidth="1px" borderRadius="lg">
        <Heading size="sm" mb={3}>
          Попробуйте
        </Heading>
        <Stack gap={2}>
          <Link asChild color="blue.500">
            <NextLink href="/examples/url-prefill?name=Иван&email=ivan@test.com">
              ?name=Иван&email=ivan@test.com
            </NextLink>
          </Link>
          <Link asChild color="blue.500">
            <NextLink href="/examples/url-prefill?name=John&email=john@example.com&phone=+1234567890">
              ?name=John&email=john@example.com&phone=+1234567890
            </NextLink>
          </Link>
        </Stack>
      </Box>

      <Box p={6} borderWidth="1px" borderRadius="lg">
        <Heading size="sm" mb={3}>
          Код
        </Heading>
        <Code display="block" p={4} whiteSpace="pre" fontSize="sm">
          {`const prefilled = useUrlPrefill({
  fields: ['name', 'email', 'phone'],
  cleanUrl: true,
})

<Form initialValue={{ ...defaults, ...prefilled }} ...>`}
        </Code>
      </Box>
    </VStack>
  )
}
