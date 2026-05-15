/**
 * Базовый HTML шаблон для email
 *
 * Адаптивный, минималистичный дизайн с настраиваемым брендингом
 */

import type { BrandingConfig } from '../types'

// === Дефолтный брендинг ===

const DEFAULT_BRANDING: BrandingConfig = {
  appName: 'App',
  appUrl: 'https://example.com',
  headerColor: '#2d3748',
  buttonColor: '#3182ce',
  headerEmoji: '✉️',
}

// === Базовый шаблон ===

export interface BaseTemplateParams {
  /** Заголовок в шапке письма */
  heading: string
  /** HTML контент основной части */
  content: string
  /** Текст футера (опционально) */
  footerText?: string
  /** Брендинг */
  branding?: Partial<BrandingConfig>
}

/**
 * Создаёт базовый HTML шаблон письма
 */
export function createBaseTemplate(params: BaseTemplateParams): string {
  const { heading, content, footerText } = params
  const branding = { ...DEFAULT_BRANDING, ...params.branding }

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 100%;">
          <!-- Шапка -->
          <tr>
            <td style="background-color: ${branding.headerColor}; padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${branding.headerEmoji} ${heading}
              </h1>
            </td>
          </tr>

          <!-- Контент -->
          <tr>
            <td style="padding: 30px;">
              ${content}
            </td>
          </tr>

          <!-- Футер -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                ${
                  footerText ||
                  `Это автоматическое письмо от <a href="${branding.appUrl}" style="color: ${branding.buttonColor};">${branding.appName}</a>.`
                }
              </p>
              ${
                branding.unsubscribeUrl
                  ? `<p style="margin: 10px 0 0; font-size: 11px; color: #bbb;">
                  <a href="${branding.unsubscribeUrl}" style="color: #999; text-decoration: underline;">Отписаться от рассылок</a>
                </p>`
                  : ''
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

// === Компоненты ===

/**
 * Создаёт HTML для приветствия
 */
export function createGreeting(userName?: string): string {
  return `<p style="margin: 0 0 20px; font-size: 16px;">
  Здравствуйте${userName ? `, <strong>${userName}</strong>` : ''}!
</p>`
}

/**
 * Создаёт HTML для основного текста
 */
export function createParagraph(text: string, color = '#555'): string {
  return `<p style="margin: 0 0 20px; font-size: 16px; color: ${color};">
  ${text}
</p>`
}

/**
 * Создаёт HTML для кнопки действия
 */
export function createButton(text: string, url: string, color = '#3182ce'): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
  <tr>
    <td style="background-color: ${color}; border-radius: 6px;">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </td>
  </tr>
</table>
`
}

/**
 * Создаёт HTML для альтернативной ссылки
 */
export function createLinkFallback(url: string, color = '#3182ce'): string {
  return `<p style="margin: 20px 0 0; font-size: 12px; color: #999;">
  Или скопируйте ссылку: <a href="${url}" style="color: ${color}; word-break: break-all;">${url}</a>
</p>`
}

/**
 * Создаёт HTML для блока с PIN-кодом
 */
export function createPinBlock(pin: string, validMinutes = 10, color = '#2d3748'): string {
  return `
<div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
  <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
    Или введите код подтверждения на сайте:
  </p>
  <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: ${color}; font-family: 'Courier New', monospace;">
    ${pin}
  </p>
  <p style="margin: 10px 0 0; font-size: 12px; color: #999;">
    Код действителен <strong>${validMinutes} минут</strong>
  </p>
</div>
`
}

/**
 * Создаёт HTML для предупреждения
 */
export function createWarning(text: string): string {
  return `<p style="margin: 20px 0 0; font-size: 14px; color: #e53e3e;">
  ⚠️ ${text}
</p>`
}

/**
 * Создаёт HTML для мелкого текста
 */
export function createSmallText(text: string): string {
  return `<p style="margin: 20px 0 0; font-size: 12px; color: #999;">
  ${text}
</p>`
}
