/**
 * Минимальный структурный контракт результата Better Auth клиента (`{ data, error }`),
 * не завязанный на полный тип конкретного метода — по образцу {@link ResendCapableAuthClient}
 * (`resend-verification-button.tsx`).
 */
export interface AuthResultLike {
  error?: {
    message?: string | null
    code?: string | null
    status?: number | null
  } | null
}

/** Параметры выбора текста ошибки. Строка вместо объекта — сокращение для `defaultMessage`. */
export interface AssertAuthOkOptions {
  /** Локализованный текст формы — запасной для ошибок с кодом Better Auth. */
  defaultMessage?: string
  /**
   * Локализованные тексты по `error.code` (например `INVALID_EMAIL_OR_PASSWORD`,
   * `USER_ALREADY_EXISTS`). Приоритетнее всего остального.
   */
  messages?: Record<string, string>
}

/**
 * Готовый русский словарь для `messages` — типовые коды Better Auth форм входа, регистрации и
 * сброса пароля. Подключается явно (`messages: AUTH_ERROR_MESSAGES_RU`), а не по умолчанию:
 * многоязычные приложения (aboi: ru/en/cn) берут тексты из своего i18n. Дополнять/перекрывать
 * можно через spread: `{ ...AUTH_ERROR_MESSAGES_RU, USER_ALREADY_EXISTS: '...' }`.
 */
export const AUTH_ERROR_MESSAGES_RU: Readonly<Record<string, string>> = {
  INVALID_EMAIL_OR_PASSWORD: 'Неверный email или пароль',
  INVALID_PASSWORD: 'Неверный пароль',
  INVALID_EMAIL: 'Некорректный email',
  USER_NOT_FOUND: 'Пользователь не найден',
  USER_ALREADY_EXISTS: 'Этот email уже зарегистрирован. Войдите или восстановите пароль.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Этот email уже зарегистрирован. Войдите или восстановите пароль.',
  EMAIL_NOT_VERIFIED: 'Email не подтверждён. Отправьте письмо повторно и перейдите по ссылке.',
  PASSWORD_TOO_SHORT: 'Пароль слишком короткий',
  PASSWORD_TOO_LONG: 'Пароль слишком длинный',
  INVALID_TOKEN: 'Ссылка недействительна или истекла. Запросите новую.',
  TOKEN_EXPIRED: 'Ссылка недействительна или истекла. Запросите новую.',
  SESSION_EXPIRED: 'Сессия истекла. Войдите заново.',
}

const CYRILLIC_RE = /[а-яё]/i
const GENERIC_MESSAGE = 'Произошла ошибка'

/**
 * Выбирает текст ошибки Better Auth для пользователя. Приоритет:
 *
 * 1. `messages[code]` — текст приложения под конкретный код;
 * 2. серверный `message` с кириллицей — сервер уже локализовал сам (кастомный `APIError`);
 * 3. `defaultMessage` — если у ошибки есть `code`: это ошибка из каталога Better Auth, и её
 *    `message` — английская заготовка («Invalid email or password»), пользователю она не нужна;
 * 4. серверный `message` — ошибка без `code` (rate-limit «Too many requests», сетевой сбой):
 *    осмысленнее общего «Неверный пароль», которым форма маскировала бы причину;
 * 5. `defaultMessage`, затем общее «Произошла ошибка».
 */
export function resolveAuthErrorMessage(
  error: NonNullable<AuthResultLike['error']>,
  options?: string | AssertAuthOkOptions,
): string {
  const { defaultMessage, messages } = typeof options === 'string' ? { defaultMessage: options } : options ?? {}
  const serverMessage = error.message?.trim() || undefined

  const byCode = error.code ? messages?.[error.code] : undefined
  if (byCode) {
    return byCode
  }
  if (serverMessage && CYRILLIC_RE.test(serverMessage)) {
    return serverMessage
  }
  if (error.code && defaultMessage) {
    return defaultMessage
  }
  return serverMessage ?? defaultMessage ?? GENERIC_MESSAGE
}

/**
 * Throw-bridge между Better Auth `authClient.*` (`signIn.email`, `signUp.email`,
 * `resetPassword`, `requestPasswordReset`, ... — все возвращают `{ data, error }`, не бросают) и
 * контрактом `@letar/forms` (`onSubmit` обязан бросать — см. `libs/forms/docs/server-errors.md`
 * §«Better Auth — throw-bridge»).
 *
 * Текст ошибки выбирает {@link resolveAuthErrorMessage}: английский `message` Better Auth не
 * перекрывает локализованный `defaultMessage` формы.
 *
 * @example
 * ```tsx
 * async function handleSubmit(data: SignUpData) {
 *   const result = await authClient.signUp.email(data)
 *   assertAuthOk(result, {
 *     defaultMessage: 'Ошибка регистрации',
 *     messages: { USER_ALREADY_EXISTS: 'Такой email уже зарегистрирован' },
 *   })
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
  options?: string | AssertAuthOkOptions,
): asserts result is T & { error?: null } {
  if (result.error) {
    throw new Error(resolveAuthErrorMessage(result.error, options))
  }
}
