'use client'

import { Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  // Шаг 1: Personal
  firstName: z
    .string()
    .min(2)
    .meta({ ui: { title: 'First Name' } }),
  lastName: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Last Name' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email' } }),

  // Шаг 2: Address
  city: z.string().meta({ ui: { title: 'City' } }),
  street: z.string().meta({ ui: { title: 'Street' } }),
  zip: z.string().meta({ ui: { title: 'ZIP Code' } }),

  // Шаг 3: Preferences
  plan: z.enum(['free', 'pro', 'enterprise']).meta({ ui: { title: 'Plan' } }),
  newsletter: z.boolean().meta({ ui: { title: 'Subscribe to updates' } }),
})

const planOptions = [
  { value: 'free', label: 'Free — $0/mo' },
  { value: 'pro', label: 'Pro — $9/mo' },
  { value: 'enterprise', label: 'Enterprise — $49/mo' },
]

export default function MultiStepPage() {
  return (
    <Stack gap={6}>
      <div>
        <Heading size="lg">Multi-Step Form</Heading>
        <Text color="fg.muted">Wizard-style form with step navigation and per-step validation.</Text>
      </div>

      <Form
        schema={Schema}
        initialValue={{
          firstName: '',
          lastName: '',
          email: '',
          city: '',
          street: '',
          zip: '',
          plan: 'free',
          newsletter: false,
        }}
        onSubmit={async (data) => alert(`Registration complete!\n${JSON.stringify(data, null, 2)}`)}
      >
        <Form.Steps animated validateOnNext linear colorPalette="brand">
          <Form.Steps.Indicator />

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
              <Form.Field.String name="zip" />
            </Stack>
          </Form.Steps.Step>

          <Form.Steps.Step title="Preferences">
            <Stack gap={4}>
              <Form.Field.RadioGroup name="plan" options={planOptions} />
              <Form.Field.Checkbox name="newsletter" />
            </Stack>
          </Form.Steps.Step>

          <Form.Steps.Navigation />
        </Form.Steps>

        <Form.DebugValues showInProduction />
      </Form>
    </Stack>
  )
}
