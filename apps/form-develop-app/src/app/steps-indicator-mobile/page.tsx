'use client'

import { Card, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'

/**
 * Демо FM-013: индикатор из четырёх шагов на узком экране (360 px).
 * Подписи неактивных шагов скрыты, страница не шире экрана.
 */
export default function StepsIndicatorMobilePage() {
  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="xl">Steps.Indicator на узком экране</Heading>
        <Text color="fg.muted">Четыре шага. Откройте на 360 px: у неактивных шагов остаются только номера.</Text>
        <Card.Root>
          <Card.Body>
            <Form initialValue={{ a: '', b: '', c: '', d: '' }} onSubmit={() => undefined}>
              <Form.Steps>
                <Form.Steps.Indicator showDescriptions />
                <Form.Steps.Step title="Объект" description="Что строим">
                  <Form.Field.String name="a" label="Название" />
                </Form.Steps.Step>
                <Form.Steps.Step title="Система" description="Тип дома">
                  <Form.Field.String name="b" label="Система" />
                </Form.Steps.Step>
                <Form.Steps.Step title="Материалы" description="Что нужно">
                  <Form.Field.String name="c" label="Материал" />
                </Form.Steps.Step>
                <Form.Steps.Step title="Итог" description="Проверка">
                  <Form.Field.String name="d" label="Комментарий" />
                </Form.Steps.Step>
                <Form.Steps.Navigation />
              </Form.Steps>
            </Form>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
