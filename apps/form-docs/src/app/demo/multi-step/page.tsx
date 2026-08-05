'use client'

import { ChakraProvider, defaultSystem, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  firstName: z.string().meta({
    ui: { title: 'First Name', placeholder: 'John' },
  }),
  lastName: z.string().meta({
    ui: { title: 'Last Name', placeholder: 'Doe' },
  }),
  email: z
    .string()
    .email()
    .meta({
      ui: { title: 'Email', placeholder: 'john@example.com' },
    }),
  city: z.string().meta({
    ui: { title: 'City', placeholder: 'New York' },
  }),
  street: z.string().meta({
    ui: { title: 'Street', placeholder: '123 Main St' },
  }),
  newsletter: z.boolean().meta({
    ui: { title: 'Subscribe to newsletter' },
  }),
  language: z.enum(['en', 'ru', 'de', 'fr']).meta({
    ui: { title: 'Preferred Language' },
  }),
})

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Russian' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
]

export default function MultiStepDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Form
        schema={Schema}
        initialValue={{
          firstName: '',
          lastName: '',
          email: '',
          city: '',
          street: '',
          newsletter: false,
          language: 'en',
        }}
        onSubmit={(data) => setSubmitted(data)}
      >
        <Form.Steps animated validateOnNext>
          <Form.Steps.Step title="Personal Info">
            <Stack gap={4}>
              <Form.Field.String name="firstName" />
              <Form.Field.String name="lastName" />
              <Form.Field.String name="email" />
            </Stack>
          </Form.Steps.Step>

          <Form.Steps.Step title="Address">
            <Stack gap={4}>
              <Form.Field.String name="city" />
              <Form.Field.String name="street" />
            </Stack>
          </Form.Steps.Step>

          <Form.Steps.Step title="Preferences">
            <Stack gap={4}>
              <Form.Field.Checkbox name="newsletter" />
              <Form.Field.Select name="language" options={languageOptions} />
            </Stack>
          </Form.Steps.Step>

          <Form.Steps.Navigation />
        </Form.Steps>

        <SubmittedDataPreview data={submitted} />
      </Form>
    </ChakraProvider>
  )
}
