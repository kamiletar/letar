'use client'

import { Code, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'

export default function MatrixChoiceExamplePage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <Stack gap={8} maxW="3xl">
      <Stack gap={2}>
        <Heading size="xl">Matrix Choice</Heading>
        <Text color="fg.muted">
          Survey-style matrix with rows (questions) and columns (answer options). Supports radio, checkbox, and rating
          variants.
        </Text>
      </Stack>

      <Form initialValue={{ satisfaction: {} }} onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}>
        <Form.Field.MatrixChoice
          name="satisfaction"
          label="How satisfied are you?"
          rows={[
            { value: 'speed', label: 'Delivery speed' },
            { value: 'quality', label: 'Product quality' },
            { value: 'support', label: 'Customer support' },
            { value: 'price', label: 'Value for money' },
          ]}
          columns={[
            { value: '1', label: 'Very Bad' },
            { value: '2', label: 'Bad' },
            { value: '3', label: 'OK' },
            { value: '4', label: 'Good' },
            { value: '5', label: 'Excellent' },
          ]}
          variant="radio"
        />
        <Form.Button.Submit>Submit Survey</Form.Button.Submit>
      </Form>

      {result && (
        <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
          {result}
        </Code>
      )}
    </Stack>
  )
}
