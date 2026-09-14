'use client'

import { AuthHubForm } from '@/auth-hub-form'
import { authClient } from '@/lib/auth-client'
import { EmailCodePanel, useEmailCodeVerification } from '@letar/pin-auth/client'
import { createPinSchema } from '@letar/pin-auth/schemas'
import { VerifiedElsewhere } from './verified-elsewhere'

// Без uiMeta.fieldType — поле рендерится явным тегом Field.PinInput ниже, схема нужна
// только для валидации длины кода.
const PinSchema = createPinSchema({ length: 6 })

interface VerifyEmailCodeProps {
  email: string
  /** OIDC-продолжение или '/', см. usePostSignInCallback */
  callbackUrl: string
}

/**
 * Экран ввода кода после регистрации (PLAN_EMAIL_CODE.md A.2) — заменяет прежнее статическое
 * «Проверьте почту». Повторная отправка идёт через `/send-verification-email` (R2), а не
 * `/email-otp/send-verification-otp` — только так письмо приходит со ссылкой и кодом сразу
 * и обновляется cookie SSE-потока.
 */
export function VerifyEmailCode({ email, callbackUrl }: VerifyEmailCodeProps) {
  const state = useEmailCodeVerification({
    verify: async (code) => {
      const { error } = await authClient.emailOtp.verifyEmail({ email, otp: code })
      if (error) {
        return { ok: false, code: error.code, message: error.message }
      }
      return { ok: true }
    },
    resend: async () => {
      const { error } = await authClient.sendVerificationEmail({ email, callbackURL: callbackUrl })
      if (error) {
        return { ok: false, code: error.code, message: error.message }
      }
      return { ok: true }
    },
    onVerified: () => {
      // Сессия только что поставлена cookie better-auth — полная навигация, не router.push.
      window.location.href = callbackUrl
    },
  })

  return (
    <EmailCodePanel
      email={email}
      state={state}
      elsewhere={<VerifiedElsewhere email={email} callbackUrl={callbackUrl} />}
      renderCodeForm={({ formKey, disabled, onComplete }) => (
        <AuthHubForm key={formKey} schema={PinSchema} initialValue={{ pin: '' }} onSubmit={() => {}}>
          {
            /* Явный тег Field.PinInput, не Field.Auto: Field.Auto с meta.fieldType не
              прокидывает произвольные props вроде onComplete в renderFieldByType — только
              явно перечисленный подмножество (label/placeholder/disabled/…), см.
              libs/forms/src/lib/declarative/form-fields/auto/field-auto.tsx. Найдено вживую
              на этом экране (автосабмит молчал), не переносить обратно на Field.Auto без
              починки библиотеки. */
          }
          <AuthHubForm.Field.PinInput name="pin" count={6} otp disabled={disabled} onComplete={onComplete} />
        </AuthHubForm>
      )}
    />
  )
}
