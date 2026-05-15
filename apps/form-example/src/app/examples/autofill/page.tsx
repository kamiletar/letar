'use client'

import { Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const ContactSchema = z
  .object({
    firstName: z
      .string()
      .min(1)
      .meta({ ui: { title: 'First Name' } }),
    lastName: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Last Name' } }),
    email: z
      .string()
      .email()
      .meta({ ui: { title: 'Email' } }),
    phone: z
      .string()
      .optional()
      .meta({ ui: { title: 'Phone' } }),
    company: z
      .string()
      .optional()
      .meta({ ui: { title: 'Company' } }),
    address: z
      .string()
      .optional()
      .meta({ ui: { title: 'Street Address' } }),
    city: z
      .string()
      .optional()
      .meta({ ui: { title: 'City' } }),
    postalCode: z
      .string()
      .optional()
      .meta({ ui: { title: 'Postal Code' } }),
    country: z
      .string()
      .optional()
      .meta({ ui: { title: 'Country' } }),
  })
  .strip()

const PasswordSchema = z
  .object({
    username: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Username' } }),
    password: z
      .string()
      .min(8)
      .meta({ ui: { title: 'Password' } }),
    newPassword: z
      .string()
      .min(8)
      .meta({ ui: { title: 'New Password' } }),
  })
  .strip()

const OverrideSchema = z
  .object({
    deliveryAddress: z.string().meta({
      ui: { title: 'Delivery Address', autocomplete: 'street-address' },
    }),
    secretCode: z.string().meta({
      ui: { title: 'Secret Code', autocomplete: 'off' },
    }),
  })
  .strip()

export default function AutofillPage() {
  return (
    <Stack gap={8}>
      <div>
        <Heading size="lg">Smart Autofill</Heading>
        <Text color="fg.muted">
          Fields automatically get HTML autocomplete attributes based on their names. Inspect the inputs in DevTools to
          verify. Try Chrome autofill!
        </Text>
      </div>

      <div>
        <Heading size="md" mb={3}>
          Contact Form (auto-detected)
        </Heading>
        <Text color="fg.muted" mb={3}>
          All fields get autocomplete automatically — no props needed.
        </Text>
        <Form
          schema={ContactSchema}
          initialValue={{ firstName: '', lastName: '', email: '' }}
          onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
        >
          <Stack gap={4}>
            <Form.Field.String name="firstName" />
            <Form.Field.String name="lastName" />
            <Form.Field.String name="email" />
            <Form.Field.String name="phone" />
            <Form.Field.String name="company" />
            <Form.Field.String name="address" />
            <Form.Field.String name="city" />
            <Form.Field.String name="postalCode" />
            <Form.Field.String name="country" />
            <Form.DebugValues showInProduction />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Stack>
        </Form>
      </div>

      <div>
        <Heading size="md" mb={3}>
          Password Fields
        </Heading>
        <Form
          schema={PasswordSchema}
          initialValue={{ username: '', password: '', newPassword: '' }}
          onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
        >
          <Stack gap={4}>
            <Form.Field.String name="username" />
            <Form.Field.Password name="password" />
            <Form.Field.Password name="newPassword" />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Stack>
        </Form>
      </div>

      <div>
        <Heading size="md" mb={3}>
          Override via .meta()
        </Heading>
        <Text color="fg.muted" mb={3}>
          Custom autocomplete via schema meta and explicit off.
        </Text>
        <Form
          schema={OverrideSchema}
          initialValue={{ deliveryAddress: '', secretCode: '' }}
          onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
        >
          <Stack gap={4}>
            <Form.Field.String name="deliveryAddress" />
            <Form.Field.String name="secretCode" />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Stack>
        </Form>
      </div>
    </Stack>
  )
}
