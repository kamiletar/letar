/**
 * Шаблон письма сброса пароля
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
  createWarning,
} from './base'

export interface PasswordResetTemplateParams {
  /** Имя пользователя */
  userName?: string
  /** URL сброса пароля */
  resetUrl: string
  /** PIN-код (опционально) */
  pin?: string
  /** Срок действия ссылки в минутах */
  expiresInMinutes?: number
  /** Брендинг */
  branding: BrandingConfig
}

/**
 * Создаёт HTML для письма сброса пароля
 */
export function createPasswordResetEmailHtml(params: PasswordResetTemplateParams): string {
  const { userName, resetUrl, pin, expiresInMinutes = 60, branding } = params

  let content = createGreeting(userName)
  content += createParagraph(
    `Вы запросили сброс пароля для вашего аккаунта на ${branding.appName}. Нажмите кнопку ниже, чтобы создать новый пароль.`,
  )

  // PIN-код если есть
  if (pin) {
    content += createPinBlock(pin, expiresInMinutes, branding.headerColor)
  }

  content += createButton('Сбросить пароль', resetUrl, branding.buttonColor)
  content += createLinkFallback(resetUrl, branding.buttonColor)
  content += createWarning(`Ссылка действительна <strong>${expiresInMinutes} минут</strong>. Не передавайте её никому!`)
  content += createSmallText(
    `Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо. Ваш пароль останется без изменений.`,
  )

  return createBaseTemplate({
    heading: 'Сброс пароля',
    content,
    branding: {
      ...branding,
      headerEmoji: '🔐',
    },
  })
}

/**
 * Создаёт текстовую версию письма сброса пароля
 */
export function createPasswordResetEmailText(params: PasswordResetTemplateParams): string {
  const { userName, resetUrl, pin, expiresInMinutes = 60, branding } = params

  const pinText = pin ? `\nВаш код подтверждения: ${pin}\nКод действителен ${expiresInMinutes} минут.\n` : ''

  return `
Сброс пароля

Здравствуйте${userName ? `, ${userName}` : ''}!

Вы запросили сброс пароля для вашего аккаунта на ${branding.appName}.
${pinText}
Сбросить пароль: ${resetUrl}

⚠️ Ссылка действительна ${expiresInMinutes} минут. Не передавайте её никому!

Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

---
Это автоматическое письмо от ${branding.appName}.
`.trim()
}
