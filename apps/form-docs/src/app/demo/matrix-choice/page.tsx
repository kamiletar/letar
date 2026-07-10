'use client'

import { Box, ChakraProvider, Code, defaultSystem, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const Schema = z
  .object({
    feedback: z.record(z.string(), z.string()).meta({ ui: { title: 'Customer Feedback' } }),
  })
  .strip()

export default function MatrixChoiceDemoPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Box maxW="800px" mx="auto" py={8} px={4}>
        <Stack gap={6}>
          <Heading size="xl">MatrixChoice Demo</Heading>
          <Text color="fg.muted">
            Survey-style matrix with rows (questions) and columns (answers). Supports radio, checkbox, and rating
            variants.
          </Text>

          <Form
            schema={Schema}
            initialValue={{ feedback: {} }}
            onSubmit={(data) => setResult(data as Record<string, unknown>)}
          >
            <Form.Field.MatrixChoice
              name="feedback"
              label="Rate our service"
              rows={[
                { value: 'speed', label: 'Delivery Speed' },
                { value: 'quality', label: 'Product Quality' },
                { value: 'support', label: 'Customer Support' },
                { value: 'price', label: 'Price / Value' },
              ]}
              columns={[
                { value: '1', label: 'Poor' },
                { value: '2', label: 'Fair' },
                { value: '3', label: 'Good' },
                { value: '4', label: 'Very Good' },
                { value: '5', label: 'Excellent' },
              ]}
              variant="radio"
            />
            <Form.Button.Submit>Submit Feedback</Form.Button.Submit>
          </Form>

          {result && (
            <Box p={4} bg="green.subtle" borderRadius="md">
              <Text fontWeight="bold" mb={2}>
                Submitted:
              </Text>
              <Code whiteSpace="pre-wrap">{JSON.stringify(result, null, 2)}</Code>
            </Box>
          )}
        </Stack>
      </Box>
    </ChakraProvider>
  )
}
