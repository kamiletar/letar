'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

export default function CreditCardDemoPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout
      title="Form.Field.CreditCard"
      description="Поле ввода данных банковской карты: номер с определением бренда, срок, CVC"
    >
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="md" mb={3}>
            Inline layout
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Номер карты, срок действия и CVC в одну строку. Иконка бренда определяется автоматически.
          </Text>
          <Form
            debug
            initialValue={{ card: { number: '', expiry: '', cvc: '' } }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.CreditCard name="card" label="Данные карты" layout="inline" />
            <Form.Button.Submit>Оплатить</Form.Button.Submit>
          </Form>
        </Box>

        <Box>
          <Heading size="md" mb={3}>
            Stacked layout
          </Heading>
          <Form
            debug
            initialValue={{ payment: { number: '', expiry: '', cvc: '' } }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.CreditCard name="payment" label="Карта оплаты" layout="stacked" />
            <Form.Button.Submit>Сохранить карту</Form.Button.Submit>
          </Form>
        </Box>

        {submittedData && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>
              Отправленные данные:
            </Heading>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>{JSON.stringify(submittedData, null, 2)}</pre>
          </Box>
        )}
      </VStack>
    </DemoPageLayout>
  )
}
