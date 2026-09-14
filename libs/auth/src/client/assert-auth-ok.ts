/**
 * Минимальный структурный контракт результата Better Auth клиента (`{ data, error }`),
 * не завязанный на полный тип конкретного метода — по образцу {@link ResendCapableAuthClient}
 * (`resend-verification-button.tsx`).
 */
export interface AuthResultLike {
  error?: {
    message?: string | null
    code?: string | null
  } | null
}

/**
 * Throw-bridge между Better Auth `authClient.*` (`signIn.email`, `signUp.email`,
 * `resetPassword`, `requestPasswordReset`, ... — все возвращают `{ data, error }`, не бросают) и
 * контрактом `@letar/forms` (`onSubmit` обязан бросать — см. `libs/forms/docs/server-errors.md`
 * §«Better Auth — throw-bridge»).
 *
 * @example
 * ```tsx
 * async function handleSubmit(data: SignUpData) {
 *   const result = await authClient.signUp.email(data)
 *   assertAuthOk(result, 'Ошибка регистрации')
 *   setDoneEmail(data.email)
 * }
 * ```
 *
 * Специфичную обработку конкретного `result.error.code` (например показать кнопку повторной
 * отправки письма при `EMAIL_NOT_VERIFIED`) по-прежнему нужно делать до вызова этой функции —
 * она не заменяет ветвление по коду, только устраняет повторяющийся
 * `if (result.error) throw new Error(...)` в конце обработчика:
 *
 * ```tsx
 * const result = await authClient.signIn.email(data)
 * if (result.error?.code === 'EMAIL_NOT_VERIFIED') {
 *   setShowResend(true)
 *   throw new Error('Email не подтверждён. Отправьте письмо повторно и перейдите по ссылке.')
 * }
 * assertAuthOk(result, 'Ошибка входа')
 * ```
 */
export function assertAuthOk<T extends AuthResultLike>(
  result: T,
  defaultMessage = 'Произошла ошибка',
): asserts result is T & { error?: null } {
  if (result.error) {
    throw new Error(result.error.message ?? defaultMessage)
  }
}
