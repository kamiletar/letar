export interface EmailContent {
  html: string
  text: string
  subject: string
}

export interface VerificationEmailParams {
  /** Имя пользователя */
  userName: string
  /** URL для верификации (с токеном) */
  verificationUrl: string
  /** PIN-код (опционально) */
  pin?: string
}

export interface VerificationEmailConfig {
  /** Базовый URL приложения */
  appUrl: string
  /** Название приложения */
  appName: string
  /** Основной цвет (hex) */
  primaryColor?: string
  /** Акцентный цвет для кнопок (hex) */
  accentColor?: string
  /** Время жизни PIN в минутах (для отображения) */
  pinExpiresMinutes?: number
}

/**
 * Генерирует содержимое письма для верификации email.
 *
 * @example
 * ```typescript
 * const { html, text, subject } = formatVerificationEmail(
 *   { userName: 'Иван', verificationUrl: 'https://...', pin: '123456' },
 *   { appUrl: 'https://my-app.com', appName: 'MyApp' }
 * )
 * ```
 */
export function formatVerificationEmail(
  params: VerificationEmailParams,
  config: VerificationEmailConfig,
): EmailContent {
  const { userName, verificationUrl, pin } = params
  const { appUrl, appName, primaryColor = '#1a365d', accentColor = '#CA9E67', pinExpiresMinutes = 10 } = config

  const subject = `✉️ Подтверждение email — ${appName}`

  // Блок с PIN-кодом (если есть)
  const pinBlock = pin
    ? `
              <!-- Пинкод -->
              <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
                  Или введите код подтверждения на сайте:
                </p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: ${primaryColor}; font-family: 'Courier New', monospace;">
                  ${pin}
                </p>
                <p style="margin: 10px 0 0; font-size: 12px; color: #999;">
                  Код действителен <strong>${pinExpiresMinutes} минут</strong>
                </p>
              </div>
`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Подтверждение email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Шапка -->
          <tr>
            <td style="background-color: ${primaryColor}; padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ✉️ Подтверждение email
              </h1>
            </td>
          </tr>

          <!-- Контент -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px;">
                Здравствуйте${userName ? `, <strong>${userName}</strong>` : ''}!
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; color: #555;">
                Спасибо за регистрацию на платформе ${appName}. Для завершения регистрации, пожалуйста, подтвердите ваш email.
              </p>
${pinBlock}
              <!-- Кнопка действия -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                <tr>
                  <td style="background-color: ${accentColor}; border-radius: 6px;">
                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Подтвердить email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; font-size: 12px; color: #999;">
                Или скопируйте ссылку: <a href="${verificationUrl}" style="color: ${primaryColor}; word-break: break-all;">${verificationUrl}</a>
              </p>

              <p style="margin: 20px 0 0; font-size: 12px; color: #999;">
                Если вы не регистрировались на платформе ${appName}, просто проигнорируйте это письмо.
              </p>
            </td>
          </tr>

          <!-- Футер -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #666;">
                Это автоматическое письмо от платформы ${appName}.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                Если у вас возникли вопросы, свяжитесь с <a href="${appUrl}/support" style="color: ${primaryColor};">службой поддержки</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()

  const pinText = pin ? `\nВаш код подтверждения: ${pin}\nКод действителен ${pinExpiresMinutes} минут.\n` : ''

  const text = `
Подтверждение email

Здравствуйте${userName ? `, ${userName}` : ''}!

Спасибо за регистрацию на платформе ${appName}. Для завершения регистрации, пожалуйста, подтвердите ваш email.
${pinText}
Подтвердить email: ${verificationUrl}
Ссылка действительна в течение 24 часов.

Если вы не регистрировались на платформе ${appName}, просто проигнорируйте это письмо.

---
Это автоматическое письмо от платформы ${appName}.
`.trim()

  return { html, text, subject }
}

export interface ResetPasswordEmailParams {
  /** Имя пользователя */
  userName: string
  /** URL для сброса пароля (с токеном) */
  resetUrl: string
  /** PIN-код (опционально) */
  pin?: string
}

export interface ResetPasswordEmailConfig {
  /** Базовый URL приложения */
  appUrl: string
  /** Название приложения */
  appName: string
  /** Основной цвет (hex) */
  primaryColor?: string
  /** Акцентный цвет для кнопок (hex) */
  accentColor?: string
  /** Время жизни PIN в минутах (для отображения) */
  pinExpiresMinutes?: number
  /** Время жизни ссылки в часах (для отображения) */
  linkExpiresHours?: number
}

/**
 * Генерирует содержимое письма для сброса пароля.
 *
 * @example
 * ```typescript
 * const { html, text, subject } = formatResetPasswordEmail(
 *   { userName: 'Иван', resetUrl: 'https://...', pin: '123456' },
 *   { appUrl: 'https://my-app.com', appName: 'MyApp' }
 * )
 * ```
 */
export function formatResetPasswordEmail(
  params: ResetPasswordEmailParams,
  config: ResetPasswordEmailConfig,
): EmailContent {
  const { userName, resetUrl, pin } = params
  const {
    appUrl,
    appName,
    primaryColor = '#1a365d',
    accentColor = '#CA9E67',
    pinExpiresMinutes = 10,
    linkExpiresHours = 1,
  } = config

  const subject = `🔐 Сброс пароля — ${appName}`

  // Блок с PIN-кодом (если есть)
  const pinBlock = pin
    ? `
              <!-- Пинкод -->
              <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
                  Или введите код подтверждения на сайте:
                </p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: ${primaryColor}; font-family: 'Courier New', monospace;">
                  ${pin}
                </p>
                <p style="margin: 10px 0 0; font-size: 12px; color: #999;">
                  Код действителен <strong>${pinExpiresMinutes} минут</strong>
                </p>
              </div>
`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Сброс пароля</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Шапка -->
          <tr>
            <td style="background-color: ${primaryColor}; padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🔐 Сброс пароля
              </h1>
            </td>
          </tr>

          <!-- Контент -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px;">
                Здравствуйте${userName ? `, <strong>${userName}</strong>` : ''}!
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; color: #555;">
                Мы получили запрос на сброс пароля для вашего аккаунта на платформе ${appName}.
              </p>
${pinBlock}
              <!-- Кнопка действия -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                <tr>
                  <td style="background-color: ${accentColor}; border-radius: 6px;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Сбросить пароль
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; font-size: 12px; color: #999;">
                Ссылка действительна в течение <strong>${linkExpiresHours} ${
    linkExpiresHours === 1 ? 'часа' : 'часов'
  }</strong>.
              </p>

              <p style="margin: 20px 0 0; font-size: 12px; color: #999;">
                Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
              </p>
            </td>
          </tr>

          <!-- Футер -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #666;">
                Это автоматическое письмо от платформы ${appName}.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                Если у вас возникли вопросы, свяжитесь с <a href="${appUrl}/support" style="color: ${primaryColor};">службой поддержки</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()

  const pinText = pin ? `\nВаш код подтверждения: ${pin}\nКод действителен ${pinExpiresMinutes} минут.\n` : ''

  const text = `
Сброс пароля

Здравствуйте${userName ? `, ${userName}` : ''}!

Мы получили запрос на сброс пароля для вашего аккаунта на платформе ${appName}.
${pinText}
Сбросить пароль: ${resetUrl}
Ссылка действительна в течение ${linkExpiresHours} ${linkExpiresHours === 1 ? 'часа' : 'часов'}.

Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

---
Это автоматическое письмо от платформы ${appName}.
`.trim()

  return { html, text, subject }
}
