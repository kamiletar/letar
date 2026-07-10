'use client'

import { Box, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { AnalyticsPanel, Form, useFormAnalytics } from '@letar/forms'
import { z } from 'zod/v4'

const RegistrationSchema = z.object({
  name: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Имя', placeholder: 'Как вас зовут?' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email' } }),
  password: z
    .string()
    .min(8)
    .meta({ ui: { title: 'Пароль', fieldType: 'password' } }),
  phone: z
    .string()
    .optional()
    .meta({ ui: { title: 'Телефон', fieldType: 'phone' } }),
  agree: z.boolean().meta({ ui: { title: 'Согласен с условиями' } }),
})

export default function AnalyticsExamplePage() {
  const analytics = useFormAnalytics({ formId: 'registration', trackCorrections: true })

  return (
    <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
      <Box>
        <Heading size="lg">Form Analytics</Heading>
        <Text color="fg.muted" mt={2}>
          Заполните форму и наблюдайте за аналитикой в панели справа внизу.
        </Text>
      </Box>

      <Stack gap={6}>
        <Form
          schema={RegistrationSchema}
          initialValue={{ name: '', email: '', password: '', phone: '', agree: false }}
          onSubmit={async () => {
            analytics.trackComplete()
          }}
        >
          <Form.Field.String name="name" />
          <Form.Field.String name="email" />
          <Form.Field.Password name="password" />
          <Form.Field.Phone name="phone" />
          <Form.Field.Checkbox name="agree" />
          <Form.Button.Submit>Зарегистрироваться</Form.Button.Submit>
        </Form>

        <Box p={4} bg="bg.muted" borderRadius="md">
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            Live-метрики:
          </Text>
          <Text fontSize="sm">Completion: {analytics.completionRate}%</Text>
          <Text fontSize="sm">Errors: {analytics.totalErrors}</Text>
          <Text fontSize="sm">Fields: {analytics.fieldAnalytics.size}</Text>
          <Text fontSize="sm">Last: {analytics.lastFocusedField ?? '—'}</Text>
        </Box>
      </Stack>

      <AnalyticsPanel analytics={analytics} position="bottom-right" />
    </VStack>
  )
}
