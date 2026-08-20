'use client'

import { PageH1 } from '@/components/page-h1'
import { Box, Code, Heading, Stack, Text, VStack } from '@chakra-ui/react'

export default function TestingUtilitiesExamplePage() {
  return (
    <VStack gap={8} align="stretch" maxW="800px" mx="auto" py={8}>
      <Box>
        <PageH1 size="lg">Testing Utilities</PageH1>
        <Text color="fg.muted" mt={2}>
          Хелперы для тестирования форм с Vitest и @testing-library/react.
        </Text>
      </Box>

      <Stack gap={6}>
        <Box p={6} borderWidth="1px" borderRadius="lg">
          <Heading size="sm" mb={4}>
            Базовый тест
          </Heading>
          <Code display="block" p={4} whiteSpace="pre" fontSize="sm">
            {`import { renderForm, fillField, submitForm } from '@letar/forms/testing'

it('отправляет форму', async () => {
  const { onSubmit } = renderForm(ContactForm)

  await fillField('name', 'Иван')
  await fillField('email', 'ivan@test.com')
  await submitForm()

  expect(onSubmit).toHaveBeenCalled()
})`}
          </Code>
        </Box>

        <Box p={6} borderWidth="1px" borderRadius="lg">
          <Heading size="sm" mb={4}>
            Тест валидации
          </Heading>
          <Code display="block" p={4} whiteSpace="pre" fontSize="sm">
            {`import { renderForm, fillField, submitForm, expectFieldError } from '@letar/forms/testing'

it('показывает ошибки валидации', async () => {
  renderForm(ContactForm)

  await fillField('email', 'невалидный')
  await submitForm()

  expectFieldError('email', 'Некорректный email')
})`}
          </Code>
        </Box>

        <Box p={6} borderWidth="1px" borderRadius="lg">
          <Heading size="sm" mb={4}>
            Все хелперы
          </Heading>
          <Code display="block" p={4} whiteSpace="pre" fontSize="sm">
            {`// Рендер
renderForm(Component, options?)
TestWrapper

// Взаимодействие
fillField(name, value)
submitForm(buttonText?)

// Ассерты
expectFieldError(name, message)
expectNoFieldError(name)
expectFieldValue(name, value)

// Мультистеп
goToStep(step)
expectActiveStep(step)

// Массивы
addItem(listName?)
removeItem(index, listName?)
expectItemCount(listName, count)`}
          </Code>
        </Box>
      </Stack>
    </VStack>
  )
}
