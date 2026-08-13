'use client'

import { FieldOTPInput, FieldPasswordStrength, FieldYesNo } from '@letar/forms-shadcn'
import { useState } from 'react'

import { DemoForm, DemoPageLayout, SubmittedDataPreview } from '../_components'

interface AuthFieldsValues {
  smsCode: string
  newsletterConsent: boolean | undefined
  strongPassword: string
}

const defaultValues: AuthFieldsValues = {
  smsCode: '',
  newsletterConsent: undefined,
  strongPassword: '',
}

export default function AuthFieldsDemoPage() {
  const [submitted, setSubmitted] = useState<AuthFieldsValues | null>(null)

  return (
    <DemoPageLayout
      title="Аутентификация"
      description="OTPInput, YesNo (thumbs), PasswordStrength"
    >
      <DemoForm<AuthFieldsValues> defaultValues={defaultValues} onSubmit={setSubmitted}>
        <FieldOTPInput
          name="smsCode"
          label="SMS-код"
          onResend={async () => {
            // eslint-disable-next-line no-console
            console.log('resend otp')
          }}
        />
        <FieldYesNo name="newsletterConsent" label="Подписаться на рассылку?" variant="thumbs" />
        <FieldPasswordStrength name="strongPassword" label="Новый пароль" />

        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>

      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
