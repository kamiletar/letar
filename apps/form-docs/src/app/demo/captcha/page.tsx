'use client'

import { Box, ChakraProvider, Code, defaultSystem, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const Schema = z
  .object({
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

export default function CaptchaDemoPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Box maxW="600px" mx="auto" py={8} px={4}>
        <Stack gap={6}>
          <Heading size="xl">CAPTCHA Demo</Heading>
          <Text color="fg.muted">
            Form with CAPTCHA protection. Supports Cloudflare Turnstile, reCAPTCHA, hCaptcha, and Yandex SmartCaptcha.
          </Text>
          <Text color="fg.subtle" fontSize="sm">
            Note: CAPTCHA requires a valid site key. This demo shows the form layout — configure your provider in
            production.
          </Text>

          <Form
            schema={Schema}
            initialValue={{ email: '', message: '' }}
            onSubmit={(data) => setResult(data as Record<string, unknown>)}
          >
            <Form.Field.String name="email" />
            <Form.Field.Textarea name="message" />
            {/* <Form.Captcha provider="turnstile" siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} /> */}
            <Form.Button.Submit>Send</Form.Button.Submit>
          </Form>

          {result && (
            <Box p={4} bg="green.subtle" borderRadius="md">
              <Text fontWeight="bold" mb={2}>
                Submitted:
              </Text>
              <Code whiteSpace="pre-wrap">{JSON.stringify(result, null, 2)}</Code>
            </Box>
          )}
        </Stack>
      </Box>
    </ChakraProvider>
  )
}
