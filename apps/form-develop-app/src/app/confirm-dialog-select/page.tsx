'use client'

import { Button, Container, Heading, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { ConfirmDialog } from '@letar/ui'
import { useState } from 'react'

const options = [
  { value: 'red', label: 'Красный' },
  { value: 'green', label: 'Зелёный' },
]

/**
 * Демо FM-014: Form.Field.Select внутри ConfirmDialog (Select рисует список в Portal).
 */
export default function ConfirmDialogSelectPage() {
  const [open, setOpen] = useState(false)

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="xl">Select внутри ConfirmDialog</Heading>
        <Button onClick={() => setOpen(true)}>Открыть диалог</Button>
        <ConfirmDialog
          isOpen={open}
          onClose={() => setOpen(false)}
          onConfirm={() => undefined}
          title="Выберите цвет"
          confirmText="Готово"
          colorPalette="blue"
          description={
            <Form initialValue={{ color: '' }} onSubmit={() => undefined}>
              <Form.Field.Select
                name="color"
                label="Цвет"
                options={options}
              />
            </Form>
          }
        />
      </VStack>
    </Container>
  )
}
