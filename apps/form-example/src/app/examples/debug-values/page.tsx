'use client'

import { PageH1 } from '@/components/page-h1'
import { Box, Stack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  title: z.string().meta({ ui: { title: 'Название', placeholder: 'Введите...' } }),
  price: z.number().meta({ ui: { title: 'Цена' } }),
  active: z.boolean().meta({ ui: { title: 'Активен' } }),
  tags: z.array(z.string()),
})

export default function DebugValuesExamplePage() {
  return (
    <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
      <Box>
        <PageH1 size="lg">Debug Values</PageH1>
        <Text color="fg.muted" mt={2}>
          JSON-инспектор значений формы в реальном времени. Скрыт в production.
        </Text>
      </Box>

      <Form
        schema={Schema}
        initialValue={{ title: 'Товар', price: 100, active: true, tags: ['новинка'] }}
        onSubmit={async () => {
          /* noop */
        }}
      >
        <Stack gap={4}>
          <Form.Field.String name="title" />
          <Form.Field.Number name="price" />
          <Form.Field.Switch name="active" label="Активен" />
          <Form.DebugValues title="Значения формы" collapsed={2} />
          <Form.Button.Submit>Сохранить</Form.Button.Submit>
        </Stack>
      </Form>
    </VStack>
  )
}
