/**
 * Шаблон письма активации аккаунта ученика
 */

import type { BrandingConfig } from '../types'
import { createBaseTemplate, createButton, createLinkFallback, createParagraph, createSmallText } from './base'

export interface StudentActivationTemplateParams {
  /** Название школы */
  schoolName: string
  /** Имя ученика (опционально) */
  studentName?: string
  /** URL активации */
  activationUrl: string
  /** Срок действия в днях */
  expiresInDays: number
  /** Брендинг */
  branding: BrandingConfig
}

/**
 * Создаёт HTML для письма активации ученика
 */
export function createStudentActivationEmailHtml(params: StudentActivationTemplateParams): string {
  const { schoolName, studentName, activationUrl, expiresInDays, branding } = params

  const greeting = studentName ? `Здравствуйте, ${studentName}!` : 'Здравствуйте!'

  let content = `<p style="margin: 0 0 20px; font-size: 16px;">${greeting}</p>`

  content += createParagraph(`Автошкола <strong>${schoolName}</strong> приглашает вас на обучение.`)

  content += createParagraph(
    'Для завершения регистрации и доступа к личному кабинету перейдите по ссылке ниже и задайте пароль.'
  )

  content += createParagraph(`Ссылка действительна в течение <strong>${expiresInDays} дней</strong>.`, '#666')

  content += createButton('Активировать аккаунт', activationUrl, branding.buttonColor || '#3182ce')
  content += createLinkFallback(activationUrl, branding.buttonColor || '#3182ce')

  content += createParagraph('<strong>Что вас ждёт после активации:</strong>', '#333')

  content += `
    <ul style="margin: 0 0 20px; padding-left: 20px; color: #555;">
      <li style="margin-bottom: 8px;">Расписание ваших занятий</li>
      <li style="margin-bottom: 8px;">Информация об оплатах</li>
      <li style="margin-bottom: 8px;">Договоры и документы</li>
      <li style="margin-bottom: 8px;">Связь с инструктором</li>
    </ul>
  `

  content += createSmallText(
    'Если вы не записывались в автошколу или получили это письмо по ошибке, просто проигнорируйте его.'
  )

  return createBaseTemplate({
    heading: `Добро пожаловать в ${schoolName}`,
    content,
    branding: {
      ...branding,
      headerEmoji: '🚗',
      headerColor: branding.headerColor || '#3182ce',
    },
  })
}

/**
 * Создаёт текстовую версию письма активации
 */
export function createStudentActivationEmailText(params: StudentActivationTemplateParams): string {
  const { schoolName, studentName, activationUrl, expiresInDays, branding } = params

  const greeting = studentName ? `Здравствуйте, ${studentName}!` : 'Здравствуйте!'

  return `
Добро пожаловать в ${schoolName}

${greeting}

Автошкола ${schoolName} приглашает вас на обучение.

Для завершения регистрации и доступа к личному кабинету перейдите по ссылке ниже и задайте пароль.

Ссылка действительна в течение ${expiresInDays} дней.

Активировать аккаунт: ${activationUrl}

Что вас ждёт после активации:
- Расписание ваших занятий
- Информация об оплатах
- Договоры и документы
- Связь с инструктором

Если вы не записывались в автошколу или получили это письмо по ошибке, просто проигнорируйте его.

---
Это автоматическое письмо от ${branding.appName}.
`.trim()
}
