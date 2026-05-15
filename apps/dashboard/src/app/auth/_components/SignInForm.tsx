'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useRouter } from 'next/navigation'
import { signInAction } from '../_actions/signin.action'
import { type SignInFormData, SignInSchema } from '../_schemas/signin.schema'

const defaultValues: SignInFormData = {
  username: '',
  password: '',
}

export function SignInForm() {
  const router = useRouter()

  const handleSubmit = async (data: SignInFormData) => {
    const result = await signInAction(data)

    if (result.success) {
      // Полная перезагрузка — гарантирует чистое состояние всех провайдеров
      window.location.href = '/'
      return
    }

    toaster.error({ title: result.error })
  }

  return (
    <Form initialValue={defaultValues} schema={SignInSchema} onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        <Form.Field.String
          name="username"
          label="Username"
          placeholder="admin or viewer"
          autoComplete="username"
          required
        />

        <Form.Field.Password
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        <Form.Errors />

        <Box mt={2}>
          <Form.Button.Submit colorPalette="brand" width="full">
            Sign In
          </Form.Button.Submit>
        </Box>
      </VStack>
    </Form>
  )
}
