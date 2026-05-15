'use client'

import { Box, Code, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const RegistrationSchema = z
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
    type: z.enum(['individual', 'company']).meta({
      ui: {
        title: 'Account Type',
        options: [
          { value: 'individual', label: 'Individual' },
          { value: 'company', label: 'Company' },
        ],
      },
    }),
    companyName: z
      .string()
      .optional()
      .meta({ ui: { title: 'Company Name' } }),
    agree: z.boolean().meta({ ui: { title: 'I agree to terms' } }),
    utm_source: z.string().optional(),
    formVersion: z.string().optional(),
  })
  .strip()

export default function UtilityExamplePage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  return (
    <Stack gap={8}>
      <Box>
        <Heading size="xl" mb={2}>
          Utility Components
        </Heading>
        <Text color="fg.muted">
          InfoBlock for contextual messages, Divider for visual separation, Hidden for invisible data.
        </Text>
      </Box>

      <Form
        debug
        schema={RegistrationSchema}
        initialValue={{
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          type: 'individual' as const,
          companyName: '',
          agree: false,
          utm_source: '',
          formVersion: '',
        }}
        onSubmit={(data) => setResult(data as Record<string, unknown>)}
      >
        <Form.InfoBlock variant="info" title="Welcome">
          Create your account. All fields marked with * are required.
        </Form.InfoBlock>

        <Form.Divider label="Personal Information" />

        <HStack gap={4}>
          <Form.Field.String name="firstName" />
          <Form.Field.String name="lastName" />
        </HStack>

        <Form.Divider label="Contact Details" />

        <Form.Field.String name="email" />
        <Form.Field.String name="phone" />

        <Form.Divider variant="dashed" />

        <Form.Field.Select name="type" />

        <Form.When field="type" is="company">
          <Form.InfoBlock variant="warning">
            Company accounts require additional verification (1-2 business days).
          </Form.InfoBlock>
          <Form.Field.String name="companyName" />
        </Form.When>

        <Form.InfoBlock variant="success">Free plan includes 1000 API calls per month.</Form.InfoBlock>

        <Form.Field.Checkbox name="agree" />

        {/* Скрытые поля — не видны в форме, но отправляются */}
        <Form.Field.Hidden name="utm_source" value="example-app" />
        <Form.Field.Hidden name="formVersion" value="3.0" />

        <Form.Button.Submit>Create Account</Form.Button.Submit>
      </Form>

      {result && (
        <Box p={4} bg="green.subtle" borderRadius="md">
          <Heading size="sm" mb={2}>
            Submitted data (note hidden fields):
          </Heading>
          <Code whiteSpace="pre" display="block" fontSize="sm">
            {JSON.stringify(result, null, 2)}
          </Code>
        </Box>
      )}
    </Stack>
  )
}
