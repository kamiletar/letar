import { Card } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ForgotPasswordFlow } from './_components/forgot-password-flow'

export const metadata: Metadata = {
  title: 'Сброс пароля',
}

/**
 * Сброс пароля кодом из письма (PLAN_EMAIL_CODE.md, R3) — без ссылки в письме сброса.
 */
export default function ForgotPasswordPage() {
  return (
    <Card.Root maxW="md" w="full" mx={4}>
      <Card.Body>
        <Suspense>
          <ForgotPasswordFlow />
        </Suspense>
      </Card.Body>
    </Card.Root>
  )
}
