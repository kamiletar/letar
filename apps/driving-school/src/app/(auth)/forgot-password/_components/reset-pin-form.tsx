'use client'

import { resendResetPinAction, verifyResetPinAction } from '@/app/(auth)/_actions/verify-reset-pin.action'
import { PinVerificationForm } from '@/app/(auth)/_components/pin-verification-form'
import { Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'

interface ResetPinFormProps {
  email: string
}

/**
 * Форма верификации PIN при сбросе пароля
 */
export function ResetPinForm({ email }: ResetPinFormProps) {
  const router = useRouter()

  return (
    <PinVerificationForm
      email={email}
      sseEndpoint={`/api/auth/reset-stream/${encodeURIComponent(email)}`}
      verifyAction={verifyResetPinAction}
      resendAction={resendResetPinAction}
      sseEvents={{ completedField: 'reset', openedField: 'opened' }}
      onVerified={(result) => {
        // Редирект на страницу сброса пароля с токеном
        router.push(`/reset-password?token=${result.resetToken}`)
      }}
      texts={{
        title: 'Введите код',
        subtitle: email,
        verifiedTitle: 'Код подтверждён!',
        verifiedMessage: 'Переходим к сбросу пароля...',
        otherTabCompletedTitle: 'Пароль изменён!',
        otherTabCompletedMessage:
          'Вы перешли по ссылке из письма и сбросили пароль.\nТеперь можете войти с новым паролем.',
        otherTabCompletedActions: (
          <Button colorPalette="brand" onClick={() => router.push('/sign-in')}>
            Перейти ко входу
          </Button>
        ),
        otherTabOpenedTitle: 'Продолжите в другом окне',
        otherTabOpenedMessage: 'Вы перешли по ссылке из письма в другом окне.\nЭто окно можно закрыть.',
        otherTabOpenedActions: (
          <Button variant="outline" onClick={() => window.close()}>
            Закрыть окно
          </Button>
        ),
      }}
    />
  )
}
