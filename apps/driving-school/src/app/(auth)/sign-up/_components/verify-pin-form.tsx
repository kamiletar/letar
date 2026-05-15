'use client'

import { resendVerificationPinAction } from '@/app/(auth)/_actions/resend-pin.action'
import { verifyAndLoginWithRedirect } from '@/app/(auth)/_actions/verify-login.action'
import { verifyPinAction } from '@/app/(auth)/_actions/verify-pin.action'
import { PinVerificationForm } from '@/app/(auth)/_components/pin-verification-form'

interface VerifyPinFormProps {
  email: string
}

/**
 * Форма верификации email при регистрации
 */
export function VerifyPinForm({ email }: VerifyPinFormProps) {
  return (
    <PinVerificationForm
      email={email}
      sseEndpoint={`/api/auth/verification-stream/${encodeURIComponent(email)}`}
      verifyAction={verifyPinAction}
      resendAction={resendVerificationPinAction}
      sseEvents={{ completedField: 'verified' }}
      onVerified={async (result) => {
        // Авто-логин после верификации (Server Action с redirect)
        await verifyAndLoginWithRedirect({
          email,
          verificationToken: result.token ?? '',
        })
      }}
      texts={{
        title: 'Подтвердите email',
        subtitle: email,
        verifiedTitle: 'Email подтверждён!',
        verifiedMessage: 'Выполняется вход в аккаунт...',
        otherTabCompletedTitle: 'Email подтверждён!',
        otherTabCompletedMessage: 'Вы вошли в другой вкладке.\nЭту вкладку можно закрыть.',
      }}
    />
  )
}
