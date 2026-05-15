'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const AuthSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .meta({ ui: { title: 'Password (Basic)', description: 'Enter a password to see strength indicator' } }),
  passwordStrong: z
    .string()
    .min(8)
    .meta({ ui: { title: 'Password (With Requirements)', description: 'Must meet all requirements below' } }),
  otpCode: z
    .string()
    .length(6, 'Code must be 6 digits')
    .meta({ ui: { title: 'Verification Code', description: 'Enter the 6-digit code sent to your phone' } }),
  otpAlphanumeric: z
    .string()
    .length(4, 'Code must be 4 characters')
    .meta({ ui: { title: 'Alphanumeric Code (with resend)', description: 'Enter the 4-character code' } }),
})

type AuthFormData = z.infer<typeof AuthSchema>

const initialData: AuthFormData = {
  password: '',
  passwordStrong: '',
  otpCode: '',
  otpAlphanumeric: '',
}

export default function AuthDemoPage() {
  const [submittedData, setSubmittedData] = useState<AuthFormData | null>(null)

  const handleSubmit = (data: AuthFormData) => {
    setSubmittedData(data)
  }

  const handleResendCode = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    // eslint-disable-next-line no-console -- демо-приложение
    console.log('Code resent')
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="xl" mb={2}>
            Authentication Fields Demo
          </Heading>
          <Text color="fg.muted">PasswordStrength, OTPInput components</Text>
        </Box>

        <Form initialValue={initialData} schema={AuthSchema} onSubmit={handleSubmit}>
          <VStack gap={6} align="stretch">
            {/* Password Fields */}
            <Box>
              <Heading size="md" mb={4}>
                Password Fields
              </Heading>
              <VStack gap={4} align="stretch">
                <Form.Field.PasswordStrength name="password" />
                <Form.Field.PasswordStrength
                  name="passwordStrong"
                  requirements={[
                    'At least 8 characters',
                    'One uppercase letter',
                    'One lowercase letter',
                    'One number',
                    'One special character',
                  ]}
                  showRequirements
                />
              </VStack>
            </Box>

            {/* OTP Fields */}
            <Box>
              <Heading size="md" mb={4}>
                OTP Input Fields
              </Heading>
              <VStack gap={4} align="stretch">
                <Form.Field.OTPInput name="otpCode" length={6} />
                <Form.Field.OTPInput name="otpAlphanumeric" length={4} resendTimeout={30} onResend={handleResendCode} />
              </VStack>
            </Box>

            <Form.Button.Submit>Verify</Form.Button.Submit>
          </VStack>
        </Form>

        {submittedData && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>
              Submitted Data:
            </Heading>
            <Text as="pre" fontSize="sm" whiteSpace="pre-wrap" data-testid="submitted-data">
              {JSON.stringify(submittedData, null, 2)}
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
