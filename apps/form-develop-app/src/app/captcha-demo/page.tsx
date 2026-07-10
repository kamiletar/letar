'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { DemoPageLayout } from '../_components'

export default function CaptchaDemoPage() {
  return (
    <DemoPageLayout title="Form.Captcha" description="CAPTCHA виджет — Turnstile, reCAPTCHA, hCaptcha">
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="md" mb={3}>
            Использование
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            CAPTCHA требует настоящий siteKey от провайдера. Ниже — API и примеры конфигурации.
          </Text>
          <Code display="block" whiteSpace="pre" fontSize="xs" p={4} borderRadius="md">
            {`// В createForm (один раз для приложения)
const AppForm = createForm({
  captcha: {
    provider: 'turnstile',
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
    theme: 'auto',
  },
})

// В форме
<AppForm onSubmit={handleSubmit}>
  <AppForm.Field.String name="email" label="Email" />
  <AppForm.Captcha />
  <AppForm.Button.Submit>Отправить</AppForm.Button.Submit>
</AppForm>

// Серверная верификация
import { verifyCaptcha } from '@letar/forms/captcha'

const result = await verifyCaptcha(token, {
  provider: 'turnstile',
  secretKey: process.env.TURNSTILE_SECRET_KEY!,
})`}
          </Code>
        </Box>

        <Box>
          <Heading size="md" mb={3}>
            Провайдеры
          </Heading>
          <VStack align="start" gap={2} fontSize="sm">
            <Text>
              <strong>turnstile</strong> — Cloudflare Turnstile (рекомендуемый, бесплатный)
            </Text>
            <Text>
              <strong>recaptcha</strong> — Google reCAPTCHA v2/v3
            </Text>
            <Text>
              <strong>hcaptcha</strong> — hCaptcha
            </Text>
          </VStack>
        </Box>
      </VStack>
    </DemoPageLayout>
  )
}
