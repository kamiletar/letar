'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { DemoPageLayout } from '../_components'

export default function AnalyticsDemoPage() {
  return (
    <DemoPageLayout
      title="Form.Analytics"
      description="Встроенная field-level аналитика форм — drop-off, время на полях, completion rate"
    >
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="md" mb={3}>Использование</Heading>
          <Code display="block" whiteSpace="pre" fontSize="xs" p={4} borderRadius="md">
            {`import { AnalyticsPanel, createUmamiAdapter, useFormAnalytics } from '@letar/forms'

const analytics = useFormAnalytics({
  formId: 'contact-form',
  adapters: [createUmamiAdapter()],
  onAbandon: (lastField, filled, total) => {
    console.log(\`Drop-off на поле: \${lastField} (\${filled}/\${total})\`)
  },
})

<Form schema={ContactSchema} onSubmit={save}>
  <Form.Field.String name="name" />
  <Form.Field.String name="email" />
  <Form.Field.Textarea name="message" />
  <Form.Button.Submit>Отправить</Form.Button.Submit>
  
  <AnalyticsPanel analytics={analytics} position="bottom-right" />
</Form>`}
          </Code>
        </Box>

        <Box>
          <Heading size="md" mb={3}>Адаптеры</Heading>
          <Code display="block" whiteSpace="pre" fontSize="xs" p={4} borderRadius="md">
            {`// Umami (наш стек)
createUmamiAdapter()

// Яндекс Метрика (для РФ рынка)
createYandexMetrikaAdapter(12345) // counter ID → goals: form_*_abandon, form_*_complete

// Google Analytics 4
createGtagAdapter() // gtag events: form_field_interaction, form_abandon, form_complete

// PostHog
createPostHogAdapter() // posthog.capture: form_field_focus, form_form_complete

// Кастомный
const myAdapter = { name: 'custom', track: (event, formId) => fetch('/api/analytics', { body: JSON.stringify({ event, formId }) }) }`}
          </Code>
        </Box>

        <Box>
          <Heading size="md" mb={3}>Что трекается</Heading>
          <VStack align="start" gap={2} fontSize="sm">
            <Text><strong>field_focus</strong> — количество фокусов на каждом поле</Text>
            <Text><strong>field_blur</strong> — время проведённое на поле (мс)</Text>
            <Text><strong>field_error</strong> — ошибки валидации по полям</Text>
            <Text><strong>field_correction</strong> — возврат к полю после blur (исправления)</Text>
            <Text><strong>form_abandon</strong> — последнее поле, заполненных полей, общее время</Text>
            <Text><strong>form_complete</strong> — общее время, время по каждому полю</Text>
          </VStack>
        </Box>

        <Box>
          <Heading size="md" mb={3}>Статистика</Heading>
          <VStack align="start" gap={2} fontSize="sm">
            <Text>67% форм бросают незавершёнными (Zuko, 2025)</Text>
            <Text>Поле пароля — рекордсмен drop-off (10.5%)</Text>
            <Text>Оптимизация формы даёт +30-50% к completion rate</Text>
            <Text>Desktop: 47% completion vs Mobile: 42%</Text>
          </VStack>
        </Box>
      </VStack>
    </DemoPageLayout>
  )
}
