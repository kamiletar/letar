'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema for PinInput field
 */
const PinInputSchema = z.object({
  // Basic 4-digit PIN
  pin: z
    .string()
    .length(4, 'PIN must be 4 digits')
    .meta({
      ui: { title: 'PIN Code' },
    }),

  // 6-digit OTP code
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .meta({
      ui: { title: 'Verification Code', description: 'Enter the 6-digit code sent to your phone' },
    }),

  // Alphanumeric code
  alphaCode: z
    .string()
    .length(4, 'Code must be 4 characters')
    .meta({
      ui: { title: 'License Key Segment', description: 'Enter letters or numbers' },
    }),

  // Masked secret PIN
  secretPin: z
    .string()
    .length(4, 'Secret PIN must be 4 digits')
    .meta({
      ui: { title: 'Secret PIN', description: 'Your input will be hidden' },
    }),
})

type PinInputFormData = z.infer<typeof PinInputSchema>

const initialValues: PinInputFormData = {
  pin: '',
  otp: '',
  alphaCode: '',
  secretPin: '',
}

export default function PinInputDemoPage() {
  const [submittedData, setSubmittedData] = useState<PinInputFormData | null>(null)
  const [lastCompleted, setLastCompleted] = useState<string | null>(null)

  const handleSubmit = (data: PinInputFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout title="PinInput Demo" description="Form.Field.PinInput - PIN/OTP code input field">
      <Form initialValue={initialValues} schema={PinInputSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* Basic 4-digit PIN */}
          <Box>
            <Form.Field.PinInput name="pin" />
          </Box>

          {/* 6-digit OTP with otp prop */}
          <Box>
            <Form.Field.PinInput
              name="otp"
              count={6}
              otp
              onComplete={(value) => setLastCompleted(`OTP completed: ${value}`)}
            />
          </Box>

          {/* Alphanumeric code */}
          <Box>
            <Form.Field.PinInput name="alphaCode" type="alphanumeric" variant="flushed" />
          </Box>

          {/* Masked secret PIN */}
          <Box>
            <Form.Field.PinInput name="secretPin" mask attached />
          </Box>

          {/* Different sizes */}
          <Box>
            <Text fontWeight="medium" mb={2}>
              Size variants:
            </Text>
            <VStack gap={2} align="start">
              <Form.Field.PinInput name="pin" label="Small (sm)" size="sm" />
              <Form.Field.PinInput name="pin" label="Large (lg)" size="lg" />
            </VStack>
          </Box>

          {lastCompleted && (
            <Box p={3} bg="green.100" borderRadius="md" data-testid="last-completed">
              <Text color="green.800">{lastCompleted}</Text>
            </Box>
          )}

          <Form.Button.Submit>Verify All Codes</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} />
    </DemoPageLayout>
  )
}
