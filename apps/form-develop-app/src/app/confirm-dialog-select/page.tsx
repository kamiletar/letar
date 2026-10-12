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
 * Демо FM-014/FM-015: Select, Combobox и Autocomplete внутри ConfirmDialog (список рисуется в Portal).
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
            <Form initialValue={{ color: '', color2: '', city: '' }} onSubmit={() => undefined}>
              <Form.Field.Select
                name="color"
                label="Цвет"
                options={options}
              />
              <Form.Field.Combobox name="color2" label="Цвет (Combobox)" options={options} minChars={0} />
              <Form.Field.Autocomplete name="city" label="Город (Autocomplete)" suggestions={['Москва', 'Мурманск']} />
            </Form>
          }
        />
      </VStack>
    </Container>
  )
}
