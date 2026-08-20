'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Stack, Text } from '@chakra-ui/react'

export default function CaptchaExamplePage() {
  return (
    <Stack gap={8} maxW="lg">
      <Stack gap={2}>
        <PageH1 size="xl">CAPTCHA</PageH1>
        <Text color="fg.muted">
          Protect forms with Cloudflare Turnstile, Google reCAPTCHA, hCaptcha, or Yandex SmartCaptcha. Requires a real
          siteKey from the provider.
        </Text>
      </Stack>

      <Code display="block" whiteSpace="pre" fontSize="xs" p={4} borderRadius="md">
        {`// Configure in createForm
const AppForm = createForm({
  captcha: {
    provider: 'turnstile',
    siteKey: 'your-site-key',
  },
})

// Use in form
<AppForm onSubmit={handleSubmit}>
  <AppForm.Field.String name="email" />
  <AppForm.Captcha />
  <AppForm.Button.Submit>Submit</AppForm.Button.Submit>
</AppForm>`}
      </Code>

      <Text fontSize="sm" color="fg.muted">
        This example requires a real CAPTCHA siteKey. See the form-develop-app for configuration details.
      </Text>
    </Stack>
  )
}
