/**
 * Шаблон письма верификации email
 */

import type { BrandingConfig } from '../types'
import {
  createBaseTemplate,
  createButton,
  createGreeting,
  createLinkFallback,
  createParagraph,
  createPinBlock,
  createSmallText,
} from './base'

export interface VerificationTemplateParams {
  /** Имя пользователя */
  userName?: string
  /** URL верификации (опционально если есть pin) */
  verificationUrl?: string
  /** PIN-код (опционально если есть verificationUrl) */
  pin?: string
  /** Брендинг */
  branding: BrandingConfig
}

/**
 * Создаёт HTML для письма верификации
 */
export function createVerificationEmailHtml(params: VerificationTemplateParams): string {
  const { userName, verificationUrl, pin, branding } = params

  let content = createGreeting(userName)
  content += createParagraph(
    `Спасибо за регистрацию на ${branding.appName}. Для завершения регистрации, пожалуйста, подтвердите ваш email.`,
  )

  if (pin) {
    content += createPinBlock(pin, 10, branding.headerColor)
  }

  // Кнопка и ссылка только если есть URL
  if (verificationUrl) {
    content += createButton('Подтвердить email', verificationUrl, branding.buttonColor)
    content += createLinkFallback(verificationUrl, branding.buttonColor)
  }

  content += createSmallText(`Если вы не регистрировались на ${branding.appName}, просто проигнорируйте это письмо.`)

  return createBaseTemplate({
    heading: 'Подтверждение email',
    content,
    branding: {
      ...branding,
      headerEmoji: '✉️',
    },
  })
}

/**
 * Создаёт текстовую версию письма верификации
 */
export function createVerificationEmailText(params: VerificationTemplateParams): string {
  const { userName, verificationUrl, pin, branding } = params

  const pinText = pin ? `\nВаш код подтверждения: ${pin}\nКод действителен 10 минут.\n` : ''
  const urlText = verificationUrl
    ? `\nПодтвердить email: ${verificationUrl}\nСсылка действительна в течение 24 часов.\n`
    : ''

  return `
Подтверждение email

Здравствуйте${userName ? `, ${userName}` : ''}!

Спасибо за регистрацию на ${branding.appName}. Для завершения регистрации, пожалуйста, подтвердите ваш email.
${pinText}${urlText}
Если вы не регистрировались на ${branding.appName}, просто проигнорируйте это письмо.

---
Это автоматическое письмо от ${branding.appName}.
`.trim()
}
