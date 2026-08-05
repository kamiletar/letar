'use client'

import { ChakraProvider, defaultSystem, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  customerType: z.enum(['individual', 'company']).meta({
    ui: { title: 'Customer Type' },
  }),
  firstName: z
    .string()
    .optional()
    .meta({
      ui: { title: 'First Name' },
    }),
  lastName: z
    .string()
    .optional()
    .meta({
      ui: { title: 'Last Name' },
    }),
  companyName: z
    .string()
    .optional()
    .meta({
      ui: { title: 'Company Name' },
    }),
  taxId: z
    .string()
    .optional()
    .meta({
      ui: { title: 'Tax ID' },
    }),
  hasPremium: z.boolean().meta({
    ui: { title: 'Premium Subscription' },
  }),
  premiumTheme: z
    .enum(['dark', 'light', 'system'])
    .optional()
    .meta({
      ui: { title: 'Premium Theme' },
    }),
})

const customerTypeOptions = [
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
]

const themeOptions = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
]

export default function ConditionalDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Form
        schema={Schema}
        initialValue={{ customerType: 'individual', hasPremium: false }}
        onSubmit={(data) => setSubmitted(data)}
      >
        <Stack gap={4}>
          <Form.Field.Select name="customerType" options={customerTypeOptions} />

          <Form.When field="customerType" is="individual">
            <Form.Field.String name="firstName" />
            <Form.Field.String name="lastName" />
          </Form.When>

          <Form.When field="customerType" is="company">
            <Form.Field.String name="companyName" />
            <Form.Field.String name="taxId" />
          </Form.When>

          <Form.Field.Switch name="hasPremium" />

          <Form.When field="hasPremium" is={true}>
            <Form.Field.Select name="premiumTheme" options={themeOptions} />
          </Form.When>

          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
          <SubmittedDataPreview data={submitted} />
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
