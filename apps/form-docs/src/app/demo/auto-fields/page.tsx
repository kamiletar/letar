'use client'

import { ChakraProvider, defaultSystem, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  name: z.string().meta({ ui: { title: 'Full Name', placeholder: 'John Doe' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'john@example.com' } }),
  age: z
    .number()
    .min(0)
    .max(120)
    .meta({ ui: { title: 'Age' } }),
  newsletter: z.boolean().meta({ ui: { title: 'Subscribe to newsletter' } }),
})

export default function AutoFieldsDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Stack gap={4}>
        <Form.FromSchema
          schema={Schema}
          initialValue={{ name: '', email: '', age: 25, newsletter: false }}
          onSubmit={(data) => setSubmitted(data)}
          submitLabel="Create"
          debug
        />

        <SubmittedDataPreview data={submitted} />
      </Stack>
    </ChakraProvider>
  )
}
