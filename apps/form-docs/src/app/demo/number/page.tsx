'use client'

import { ChakraProvider, defaultSystem, Heading, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  quantity: z.number().meta({ ui: { title: 'Number' } }),
  volume: z
    .number()
    .min(0)
    .max(100)
    .meta({ ui: { title: 'Slider (0-100)' } }),
  price: z.number().meta({ ui: { title: 'Currency ($)' } }),
  rating: z
    .number()
    .min(1)
    .max(5)
    .meta({ ui: { title: 'Rating (1-5)' } }),
})

export default function NumberDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Form
        schema={Schema}
        initialValue={{ quantity: 1, volume: 50, price: 0, rating: 3 }}
        onSubmit={(data) => setSubmitted(data)}
      >
        <Stack gap={4}>
          <Heading size="sm">Number Fields</Heading>
          <Form.Field.Number name="quantity" />
          <Form.Field.Slider name="volume" />
          <Form.Field.Currency name="price" />
          <Form.Field.Rating name="rating" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
          <SubmittedDataPreview data={submitted} />
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
