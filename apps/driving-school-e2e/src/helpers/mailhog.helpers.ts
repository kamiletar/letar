/**
 * Хелперы для работы с MailHog в E2E тестах
 *
 * MailHog API:
 * - GET /api/v2/messages - получить все письма
 * - DELETE /api/v1/messages - удалить все письма
 * - GET /api/v2/search?kind=to&query=email@example.com - поиск по получателю
 */

// URL MailHog API (по умолчанию localhost:8025)
const MAILHOG_API_URL = process.env.MAILHOG_API_URL || 'http://localhost:8025'

/**
 * Структура письма из MailHog API
 */
export interface MailHogMessage {
  ID: string
  From: {
    Relays: string[]
    Mailbox: string
    Domain: string
    Params: string
  }
  To: {
    Relays: string[]
    Mailbox: string
    Domain: string
    Params: string
  }[]
  Content: {
    Headers: Record<string, string[]>
    Body: string
    Size: number
    MIME: {
      Parts: {
        Headers: Record<string, string[]>
        Body: string
      }[]
    } | null
  }
  Created: string
  MIME: null
  Raw: {
    From: string
    To: string[]
    Data: string
    Helo: string
  }
}

/**
 * Получить письма для указанного email
 */
export async function getEmailsForRecipient(email: string): Promise<MailHogMessage[]> {
  const response = await fetch(`${MAILHOG_API_URL}/api/v2/search?kind=to&query=${encodeURIComponent(email)}`)

  if (!response.ok) {
    throw new Error(`MailHog API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as { items: MailHogMessage[] }
  return data.items || []
}

/**
 * Получить последнее письмо для указанного email
 */
export async function getLatestEmailForRecipient(email: string): Promise<MailHogMessage | null> {
  const emails = await getEmailsForRecipient(email)

  if (emails.length === 0) {
    return null
  }

  // Сортируем по дате создания (новые первыми)
  emails.sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime())

  return emails[0]
}

/**
 * Извлечь ссылку верификации из письма
 * Ищет URL вида /verify-email/TOKEN в теле письма
 *
 * ВАЖНО: Для E2E тестов заменяет production домен на localhost
 */
export function extractVerificationLink(message: MailHogMessage): string | null {
  // Получаем тело письма
  let body = message.Content.Body

  // Если есть MIME parts, ищем HTML часть
  if (message.Content.MIME?.Parts) {
    const htmlPart = message.Content.MIME.Parts.find((part) => part.Headers['Content-Type']?.[0]?.includes('text/html'))
    if (htmlPart) {
      body = htmlPart.Body
    }
  }

  // Декодируем quoted-printable если нужно
  body = decodeQuotedPrintable(body)

  // Ищем ссылку верификации
  // Формат: http(s)://domain/verify-email/TOKEN
  const verifyLinkRegex = /https?:\/\/[^"\s<>]+\/verify-email\/[a-zA-Z0-9_-]+/g
  const matches = body.match(verifyLinkRegex)

  if (matches && matches.length > 0) {
    let link = matches[0]

    // Для E2E тестов заменяем production домен на localhost
    // Поддерживаем кириллические домены (punycode и unicode)
    const baseUrl = process.env['BASE_URL'] || 'http://localhost:3003'
    link = link.replace(/https?:\/\/[^/]+/, baseUrl)

    return link
  }

  return null
}

/**
 * Декодировать quoted-printable encoding
 */
function decodeQuotedPrintable(str: string): string {
  return (
    str
      // Убираем soft line breaks (=\r\n или =\n)
      .replace(/=\r?\n/g, '')
      // Декодируем =XX в символы
      .replace(/=([0-9A-Fa-f]{2})/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)))
  )
}

/**
 * Ожидать получения письма для указанного email
 * @param email - email получателя
 * @param timeout - таймаут ожидания в мс (по умолчанию 30 секунд)
 * @param interval - интервал проверки в мс (по умолчанию 1 секунда)
 */
export async function waitForEmail(
  email: string,
  options?: { timeout?: number; interval?: number }
): Promise<MailHogMessage> {
  const timeout = options?.timeout ?? 30000
  const interval = options?.interval ?? 1000
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const message = await getLatestEmailForRecipient(email)

    if (message) {
      return message
    }

    // Ждём перед следующей проверкой
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`Timeout waiting for email to ${email} after ${timeout}ms`)
}

/**
 * Удалить все письма из MailHog
 */
export async function clearAllEmails(): Promise<void> {
  const response = await fetch(`${MAILHOG_API_URL}/api/v1/messages`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to clear MailHog messages: ${response.status} ${response.statusText}`)
  }
}

/**
 * Проверить доступность MailHog
 */
export async function isMailHogAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${MAILHOG_API_URL}/api/v2/messages`)
    return response.ok
  } catch {
    return false
  }
}
