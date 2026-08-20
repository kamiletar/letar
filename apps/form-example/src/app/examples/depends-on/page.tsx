'use client'

import { PageH1 } from '@/components/page-h1'
import { Box, Stack, Text, VStack } from '@chakra-ui/react'
import { Form, FormDependsOn } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  paymentMethod: z.string().meta({ ui: { title: 'Способ оплаты' } }),
  cardNumber: z
    .string()
    .optional()
    .meta({ ui: { title: 'Номер карты' } }),
  iban: z
    .string()
    .optional()
    .meta({ ui: { title: 'IBAN' } }),
})

export default function DependsOnExamplePage() {
  return (
    <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
      <Box>
        <PageH1 size="lg">Каскадные поля (DependsOn)</PageH1>
        <Text color="fg.muted" mt={2}>
          Разные секции формы отображаются в зависимости от значения поля.
        </Text>
      </Box>

      <Form
        schema={Schema}
        initialValue={{ paymentMethod: '', cardNumber: '', iban: '' }}
        onSubmit={async () => {
          /* noop */
        }}
      >
        <Stack gap={4}>
          <Form.Field.Select
            name="paymentMethod"
            label="Способ оплаты"
            options={[
              { value: 'card', label: 'Банковская карта' },
              { value: 'bank', label: 'Банковский перевод' },
              { value: 'cash', label: 'Наличные' },
            ]}
          />

          <FormDependsOn
            field="paymentMethod"
            cases={{
              card: <Form.Field.String name="cardNumber" label="Номер карты" placeholder="0000 0000 0000 0000" />,
              bank: <Form.Field.String name="iban" label="IBAN" placeholder="RU12 3456 7890 1234 5678 90" />,
              cash: <Text color="fg.muted">Оплата наличными при получении</Text>,
            }}
            fallback={<Text color="fg.muted">Выберите способ оплаты</Text>}
          />

          <Form.DebugValues />
          <Form.Button.Submit>Оплатить</Form.Button.Submit>
        </Stack>
      </Form>
    </VStack>
  )
}
