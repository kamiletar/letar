'use client'

import { PageH1 } from '@/components/page-h1'
import { Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  accountType: z.enum(['personal', 'business']).meta({ ui: { title: 'Account Type' } }),
  name: z.string().meta({ ui: { title: 'Full Name', placeholder: 'John Doe' } }),
  companyName: z
    .string()
    .optional()
    .meta({ ui: { title: 'Company Name', placeholder: 'Acme Inc.' } }),
  taxId: z
    .string()
    .optional()
    .meta({ ui: { title: 'Tax ID', placeholder: 'XX-XXXXXXX' } }),
  newsletter: z.boolean().meta({ ui: { title: 'Subscribe to newsletter' } }),
  frequency: z
    .enum(['daily', 'weekly', 'monthly'])
    .optional()
    .meta({ ui: { title: 'Email frequency' } }),
})

const accountOptions = [
  { value: 'personal', label: 'Personal' },
  { value: 'business', label: 'Business' },
]

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export default function ConditionalPage() {
  return (
    <Stack gap={6}>
      <div>
        <PageH1 size="lg">Conditional Fields</PageH1>
        <Text color="fg.muted">
          Use Form.When to show/hide fields based on other values. Try switching Account Type and toggling Newsletter.
        </Text>
      </div>

      <Form
        schema={Schema}
        initialValue={{
          accountType: 'personal',
          name: '',
          companyName: '',
          taxId: '',
          newsletter: false,
          frequency: 'weekly',
        }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
      >
        <Stack gap={4}>
          <Form.Field.RadioGroup name="accountType" options={accountOptions} />
          <Form.Field.String name="name" />

          <Form.When field="accountType" is="business">
            <Form.Field.String name="companyName" />
            <Form.Field.String name="taxId" />
          </Form.When>

          <Form.Field.Checkbox name="newsletter" />

          <Form.When field="newsletter" is={true}>
            <Form.Field.Select name="frequency" options={frequencyOptions} />
          </Form.When>

          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
