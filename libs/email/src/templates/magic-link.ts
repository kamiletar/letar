/**
 * Шаблон письма Magic Link для входа без пароля
 */

import type { BrandingConfig } from '../types'
import {
  createBaseTemplate,
  createButton,
  createGreeting,
  createLinkFallback,
  createParagraph,
  createSmallText,
  createWarning,
} from './base'

export interface MagicLinkTemplateParams {
  /** Имя пользователя */
  userName?: string
  /** URL для входа */
  magicLinkUrl: string
  /** Срок действия ссылки в минутах */
  expiresInMinutes?: number
  /** Брендинг */
  branding: BrandingConfig
}

/**
 * Создаёт HTML для письма Magic Link
 */
export function createMagicLinkEmailHtml(params: MagicLinkTemplateParams): string {
  const { userName, magicLinkUrl, expiresInMinutes = 15, branding } = params

  let content = createGreeting(userName)
  content += createParagraph(`Вы запросили вход в ${branding.appName} без пароля. Нажмите кнопку ниже, чтобы войти.`)
  content += createButton(`Войти в ${branding.appName}`, magicLinkUrl, branding.buttonColor)
  content += createLinkFallback(magicLinkUrl, branding.buttonColor)
  content += createWarning(`Ссылка действительна <strong>${expiresInMinutes} минут</strong>. Не передавайте её никому!`)
  content += createSmallText(`Если вы не запрашивали вход, просто проигнорируйте это письмо.`)

  return createBaseTemplate({
    heading: `Вход в ${branding.appName}`,
    content,
    branding: {
      ...branding,
      headerEmoji: '🔑',
    },
  })
}

/**
 * Создаёт текстовую версию письма Magic Link
 */
export function createMagicLinkEmailText(params: MagicLinkTemplateParams): string {
  const { userName, magicLinkUrl, expiresInMinutes = 15, branding } = params

  return `
Вход в ${branding.appName}

Здравствуйте${userName ? `, ${userName}` : ''}!

Вы запросили вход в ${branding.appName} без пароля.

Войти: ${magicLinkUrl}

⚠️ Ссылка действительна ${expiresInMinutes} минут. Не передавайте её никому!

Если вы не запрашивали вход, просто проигнорируйте это письмо.

---
Это автоматическое письмо от ${branding.appName}.
`.trim()
}
