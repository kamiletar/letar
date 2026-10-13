'use client'

import { Card, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'

/**
 * Демо FM-019: `Field.Number` со степперами и с `hideControls`.
 * На сенсорном указателе (`pointer: coarse`) степперы встают в ряд, каждый 44×44 px.
 */
export default function NumberControlsDemoPage() {
  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="xl">Field.Number: степперы и hideControls</Heading>
        <Text color="fg.muted">
          Откройте на телефоне или в эмуляции касания. Первое поле — со степперами, второе — только ввод.
        </Text>
        <Card.Root>
          <Card.Body>
            <Form initialValue={{ withControls: 3, plotWidth: 12.5 }} onSubmit={() => undefined}>
              <VStack gap={4} align="stretch">
                <Form.Field.Number name="withControls" label="Со степперами" min={0} max={20} />
                <Form.Field.Number name="plotWidth" label="Ширина участка, м" hideControls />
              </VStack>
            </Form>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
