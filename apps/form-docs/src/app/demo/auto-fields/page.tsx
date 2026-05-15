'use client'

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

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
  return (
    <ChakraProvider value={defaultSystem}>
      <Form.FromSchema
        schema={Schema}
        initialValue={{ name: '', email: '', age: 25, newsletter: false }}
        onSubmit={async () => {}}
        submitLabel="Create"
        debug
      />
    </ChakraProvider>
  )
}
