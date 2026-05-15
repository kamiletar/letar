'use client'

import { Box, ChakraProvider, Code, defaultSystem, Heading, Stack, Text, VStack } from '@chakra-ui/react'

export default function TestingUtilitiesDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="700px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">Testing Utilities</Heading>
          <Text color="fg.muted" mt={2}>
            Helpers for testing forms with Vitest and @testing-library/react.
          </Text>
        </Box>

        <Stack gap={6}>
          <Box>
            <Heading size="sm" mb={3}>
              Installation
            </Heading>
            <Code display="block" p={4} whiteSpace="pre">
              {`npm install -D @testing-library/react @testing-library/user-event`}
            </Code>
          </Box>

          <Box>
            <Heading size="sm" mb={3}>
              Basic Test
            </Heading>
            <Code display="block" p={4} whiteSpace="pre" fontSize="sm">
              {`import { renderForm, fillField, submitForm } from '@letar/forms/testing'

it('submits contact form', async () => {
  const { onSubmit } = renderForm(ContactForm)

  await fillField('name', 'Ivan')
  await fillField('email', 'ivan@test.com')
  await submitForm()

  expect(onSubmit).toHaveBeenCalled()
})`}
            </Code>
          </Box>

          <Box>
            <Heading size="sm" mb={3}>
              Validation Test
            </Heading>
            <Code display="block" p={4} whiteSpace="pre" fontSize="sm">
              {`import { renderForm, fillField, submitForm, expectFieldError } from '@letar/forms/testing'

it('shows validation errors', async () => {
  renderForm(ContactForm)

  await fillField('email', 'not-an-email')
  await submitForm()

  expectFieldError('email', 'Invalid email')
})`}
            </Code>
          </Box>

          <Box>
            <Heading size="sm" mb={3}>
              Available Helpers
            </Heading>
            <Code display="block" p={4} whiteSpace="pre" fontSize="sm">
              {`// Rendering
renderForm(Component, options?)    // Render with ChakraProvider
TestWrapper                        // Standalone ChakraProvider wrapper

// Interaction
fillField(name, value)             // Fill field by data-field-name
submitForm(buttonText?)            // Click submit button

// Assertions
expectFieldError(name, message)    // Assert error shown
expectNoFieldError(name)           // Assert no errors
expectFieldValue(name, value)      // Assert field value

// Multi-step
goToStep(step)                     // Navigate to step
expectActiveStep(step)             // Assert current step

// Arrays
addItem(listName?)                 // Add list item
removeItem(index, listName?)       // Remove list item
expectItemCount(listName, count)   // Assert item count`}
            </Code>
          </Box>
        </Stack>
      </VStack>
    </ChakraProvider>
  )
}
