/**
 * Шаблон письма приглашения в организацию
 */

import type { BrandingConfig } from '../types'
import { createBaseTemplate, createButton, createLinkFallback, createParagraph, createSmallText } from './base'

export interface InvitationTemplateParams {
  /** Имя пригласившего */
  inviterName: string
  /** Название организации */
  organizationName: string
  /** URL приглашения */
  inviteUrl: string
  /** Роль (опционально) */
  role?: string
  /** Срок действия в днях */
  expiresInDays?: number
  /** Брендинг */
  branding: BrandingConfig
}

/**
 * Создаёт HTML для письма приглашения
 */
export function createInvitationEmailHtml(params: InvitationTemplateParams): string {
  const { inviterName, organizationName, inviteUrl, role, expiresInDays, branding } = params

  let content = `<p style="margin: 0 0 20px; font-size: 16px;">Здравствуйте!</p>`

  let inviteText = `<strong>${inviterName}</strong> приглашает вас присоединиться к <strong>${organizationName}</strong>`
  if (role) {
    inviteText += ` в роли <strong>${role}</strong>`
  }
  inviteText += '.'

  content += createParagraph(inviteText)

  if (expiresInDays) {
    content += createParagraph(`Ссылка действительна в течение <strong>${expiresInDays} дней</strong>.`, '#666')
  }

  content += createButton('Принять приглашение', inviteUrl, branding.buttonColor || '#38a169')
  content += createLinkFallback(inviteUrl, branding.buttonColor || '#38a169')
  content += createSmallText('Если вы не знаете отправителя, просто проигнорируйте это письмо.')

  return createBaseTemplate({
    heading: `Приглашение в ${organizationName}`,
    content,
    branding: {
      ...branding,
      headerEmoji: '🤝',
      headerColor: branding.headerColor || '#38a169',
    },
  })
}

/**
 * Создаёт текстовую версию письма приглашения
 */
export function createInvitationEmailText(params: InvitationTemplateParams): string {
  const { inviterName, organizationName, inviteUrl, role, expiresInDays, branding } = params

  let inviteText = `${inviterName} приглашает вас присоединиться к ${organizationName}`
  if (role) {
    inviteText += ` в роли ${role}`
  }
  inviteText += '.'

  const expiresText = expiresInDays ? `\nСсылка действительна в течение ${expiresInDays} дней.\n` : ''

  return `
Приглашение в ${organizationName}

Здравствуйте!

${inviteText}
${expiresText}
Принять приглашение: ${inviteUrl}

Если вы не знаете отправителя, просто проигнорируйте это письмо.

---
Это автоматическое письмо от ${branding.appName}.
`.trim()
}
