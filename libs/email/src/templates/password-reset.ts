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
  /** URL сброса пароля (опционально если есть pin — письмо «только код») */
  resetUrl?: string
  /** PIN-код (опционально если есть resetUrl) */
  pin?: string
  /** Срок действия ссылки в минутах (по умолчанию 60) */
  expiresInMinutes?: number
  /** Срок действия PIN-кода в минутах (по умолчанию — тот же, что у ссылки) */
  pinExpiresInMinutes?: number
  /** Брендинг */
  branding: BrandingConfig
}

/**
 * Создаёт HTML для письма сброса пароля
 */
export function createPasswordResetEmailHtml(params: PasswordResetTemplateParams): string {
  const { userName, resetUrl, pin, expiresInMinutes = 60, pinExpiresInMinutes, branding } = params
  const pinMinutes = pinExpiresInMinutes ?? expiresInMinutes

  let content = createGreeting(userName)
  content += createParagraph(
    resetUrl
      ? `Вы запросили сброс пароля для вашего аккаунта на ${branding.appName}. Нажмите кнопку ниже, чтобы создать новый пароль.`
      : `Вы запросили сброс пароля для вашего аккаунта на ${branding.appName}. Введите код ниже, чтобы задать новый пароль.`,
  )

  // PIN-код если есть
  if (pin) {
    content += createPinBlock(pin, pinMinutes, branding.headerColor)
  }

  if (resetUrl) {
    content += createButton('Сбросить пароль', resetUrl, branding.buttonColor)
    content += createLinkFallback(resetUrl, branding.buttonColor)
    content += createWarning(
      `Ссылка действительна <strong>${expiresInMinutes} минут</strong>. Не передавайте её никому!`,
    )
  } else if (pin) {
    content += createWarning('Никому не передавайте этот код.')
  }

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
  const { userName, resetUrl, pin, expiresInMinutes = 60, pinExpiresInMinutes, branding } = params
  const pinMinutes = pinExpiresInMinutes ?? expiresInMinutes

  const pinText = pin ? `\nВаш код подтверждения: ${pin}\nКод действителен ${pinMinutes} минут.\n` : ''
  const urlText = resetUrl
    ? `\nСбросить пароль: ${resetUrl}\n\n⚠️ Ссылка действительна ${expiresInMinutes} минут. Не передавайте её никому!\n`
    : pin
    ? `\n⚠️ Никому не передавайте этот код.\n`
    : ''

  return `
Сброс пароля

Здравствуйте${userName ? `, ${userName}` : ''}!

Вы запросили сброс пароля для вашего аккаунта на ${branding.appName}.
${pinText}${urlText}
Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

---
Это автоматическое письмо от ${branding.appName}.
`.trim()
}
