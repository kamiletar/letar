// Хук для управления верификацией PIN (легаси-хранилище кодов приложения, не плагин emailOTP)
export {
  type PinError,
  type PinResendResult,
  type PinVerificationActions,
  type PinVerificationState,
  type PinVerifyResult,
  usePinVerification,
  type UsePinVerificationConfig,
  type UsePinVerificationResult,
} from './use-pin-verification'

// Компонент формы PIN-верификации (4 экрана: ввод / верифицировано / завершено в другой
// вкладке / открыто в другой вкладке) — поле кода рендерит приложение своим инстансом createForm
export { PinVerificationForm, type PinVerificationFormProps, type PinVerificationTexts } from './pin-verification-form'

// Хук для таймера повторной отправки
export {
  useResendCountdown,
  type UseResendCountdownConfig,
  type UseResendCountdownResult,
} from './use-resend-countdown'

// Хук для SSE верификации
export {
  useVerificationStream,
  type UseVerificationStreamConfig,
  type UseVerificationStreamResult,
} from './use-verification-stream'

// Код из письма (PLAN_EMAIL_CODE.md §0.5) — плагин Better Auth emailOTP
export { EmailCodePanel, type EmailCodePanelProps, type EmailCodePanelTexts } from './email-code-panel'
export {
  type EmailCodeVerificationStatus,
  type ResendResult,
  useEmailCodeVerification,
  type UseEmailCodeVerificationConfig,
  type UseEmailCodeVerificationResult,
  type VerifyResult,
} from './use-email-code-verification'
