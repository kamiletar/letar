'use client'

import { Card, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'

/**
 * Демо FM-019/FM-020: числовые поля и `Field.Password`. На сенсорном указателе (`pointer: coarse`)
 * степперы встают в ряд, а они и кнопка показа пароля — 44×44 px. `hideControls` убирает степперы у `Field.Number`.
 */
export default function NumberControlsDemoPage() {
  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="xl">Touch-цели: Number, NumberInput, Currency, Percentage, Password</Heading>
        <Text color="fg.muted">
          Откройте на телефоне или в эмуляции касания. Первое поле — со степперами, второе — только ввод.
        </Text>
        <Card.Root>
          <Card.Body>
            <Form
              initialValue={{ withControls: 3, plotWidth: 12.5, qty: 2, price: 1500, discount: 10, secret: 'secret' }}
              onSubmit={() => undefined}
            >
              <VStack gap={4} align="stretch">
                <Form.Field.Number name="withControls" label="Со степперами" min={0} max={20} />
                <Form.Field.Number name="plotWidth" label="Ширина участка, м" hideControls />
                <Form.Field.NumberInput name="qty" label="NumberInput" min={0} />
                <Form.Field.Currency name="price" label="Currency" />
                <Form.Field.Percentage name="discount" label="Percentage" />
                <Form.Field.Password name="secret" label="Password (FM-020)" />
              </VStack>
            </Form>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
