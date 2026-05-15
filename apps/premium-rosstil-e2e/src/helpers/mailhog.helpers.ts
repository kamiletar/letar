/**
 * Хелперы для работы с Mailhog API
 * Mailhog API: http://localhost:8025/api/v2/
 */

const MAILHOG_API_URL = process.env.MAILHOG_API_URL || 'http://localhost:8025/api'

export interface MailhogMessage {
  ID: string
  From: {
    Relays: string[] | null
    Mailbox: string
    Domain: string
    Params: string
  }
  To: Array<{
    Relays: string[] | null
    Mailbox: string
    Domain: string
    Params: string
  }>
  Content: {
    Headers: {
      'Content-Type': string[]
      Date: string[]
      From: string[]
      'MIME-Version': string[]
      'Message-ID': string[]
      Received: string[]
      'Return-Path': string[]
      Subject: string[]
      To: string[]
    }
    Body: string
    Size: number
    MIME: {
      Parts: Array<{
        Headers: Record<string, string[]>
        Body: string
        Size: number
      }>
    } | null
  }
  Created: string
  Raw: {
    From: string
    To: string[]
    Data: string
    Helo: string
  }
}

export interface MailhogSearchResponse {
  total: number
  count: number
  start: number
  items: MailhogMessage[]
}

/**
 * Получить все письма из Mailhog
 */
export async function getMessages(): Promise<MailhogMessage[]> {
  const response = await fetch(`${MAILHOG_API_URL}/v2/messages`)

  if (!response.ok) {
    throw new Error(`Mailhog API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as MailhogSearchResponse
  return data.items
}

/**
 * Найти письма по email получателя
 */
export async function findMessagesByRecipient(email: string): Promise<MailhogMessage[]> {
  // Получаем все сообщения и фильтруем вручную
  // Mailhog search API может не работать корректно
  const allMessages = await getMessages()
  return allMessages.filter((msg) => {
    // Проверяем To заголовок
    const toHeader = msg.Content.Headers.To?.[0] || ''
    if (toHeader.toLowerCase().includes(email.toLowerCase())) {
      return true
    }
    // Проверяем массив получателей
    return msg.To.some((to) => {
      const fullEmail = `${to.Mailbox}@${to.Domain}`.toLowerCase()
      return fullEmail === email.toLowerCase()
    })
  })
}

/**
 * Декодировать MIME-encoded заголовок (Base64 или Quoted-Printable)
 */
function decodeMimeHeader(header: string): string {
  if (!header) {
    return ''
  }

  // Удаляем пробелы между MIME-encoded частями
  // (по спецификации пробелы между encoded-words игнорируются)
  const normalizedHeader = header.replace(/\?=\s+=\?/g, '?==?')

  // Паттерн для MIME encoded words: =?charset?encoding?encoded_text?=
  const mimePattern = /=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi

  const decoded = normalizedHeader.replace(mimePattern, (_match, _charset, encoding, encodedText) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        // Base64
        return Buffer.from(encodedText, 'base64').toString('utf-8')
      } else if (encoding.toUpperCase() === 'Q') {
        // Quoted-Printable
        return encodedText
          .replace(/_/g, ' ')
          .replace(/=([0-9A-F]{2})/gi, (_m: string, hex: string) => String.fromCharCode(parseInt(hex, 16)))
      }
    } catch {
      return encodedText
    }
    return encodedText
  })

  return decoded
}

/**
 * Найти письма по теме
 */
export async function findMessagesBySubject(subject: string): Promise<MailhogMessage[]> {
  const messages = await getMessages()
  return messages.filter((msg) => {
    const rawSubject = msg.Content.Headers.Subject?.[0] || ''
    const decodedSubject = decodeMimeHeader(rawSubject)
    return decodedSubject.toLowerCase().includes(subject.toLowerCase())
  })
}

/**
 * Получить последнее письмо для получателя
 */
export async function getLatestMessageForRecipient(email: string): Promise<MailhogMessage | null> {
  const messages = await findMessagesByRecipient(email)
  if (messages.length === 0) {
    return null
  }
  // Сортируем по дате создания (новые первыми)
  messages.sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime())
  return messages[0]
}

/**
 * Ожидание письма для получателя с таймаутом
 */
export async function waitForMessage(
  email: string,
  options: { timeout?: number; interval?: number; subjectContains?: string } = {}
): Promise<MailhogMessage> {
  const { timeout = 30000, interval = 1000, subjectContains } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const messages = await findMessagesByRecipient(email)

    const matching = subjectContains
      ? messages.filter((msg) => {
          const rawSubject = msg.Content.Headers.Subject?.[0] || ''
          const decodedSubject = decodeMimeHeader(rawSubject)
          return decodedSubject.toLowerCase().includes(subjectContains.toLowerCase())
        })
      : messages

    if (matching.length > 0) {
      // Возвращаем самое новое письмо
      matching.sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime())
      return matching[0]
    }

    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`Таймаут ожидания письма для ${email}${subjectContains ? ` с темой "${subjectContains}"` : ''}`)
}

/**
 * Удалить все письма из Mailhog
 */
export async function deleteAllMessages(): Promise<void> {
  const response = await fetch(`${MAILHOG_API_URL}/v1/messages`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Mailhog API error: ${response.status} ${response.statusText}`)
  }
}

/**
 * Удалить конкретное письмо по ID
 */
export async function deleteMessage(id: string): Promise<void> {
  const response = await fetch(`${MAILHOG_API_URL}/v1/messages/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Mailhog API error: ${response.status} ${response.statusText}`)
  }
}

/**
 * Извлечь ссылки из HTML тела письма
 */
export function extractLinksFromMessage(message: MailhogMessage): string[] {
  const body = getMessageBody(message)
  const linkRegex = /href=["']([^"']+)["']/gi
  const links: string[] = []
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(body)) !== null) {
    links.push(match[1])
  }

  return links
}

/**
 * Декодировать Quoted-Printable строку
 */
function decodeQuotedPrintable(str: string): string {
  // Убираем soft line breaks (=\r\n или =\n)
  const withoutSoftBreaks = str.replace(/=\r?\n/g, '')

  // Декодируем =XX в символы
  return withoutSoftBreaks.replace(/=([0-9A-F]{2})/gi, (_match, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })
}

/**
 * Парсинг сырого multipart MIME из Content.Body
 * Mailhog иногда не парсит MIME части и возвращает их в сыром виде
 */
function parseRawMultipartMime(body: string): { contentType: string; encoding: string; content: string }[] {
  const parts: { contentType: string; encoding: string; content: string }[] = []

  // Ищем boundary в теле
  const boundaryMatch = body.match(/^----_[^\r\n]+/m)
  if (!boundaryMatch) {
    return parts
  }

  const boundary = boundaryMatch[0]
  const sections = body.split(boundary)

  for (const section of sections) {
    if (!section.trim() || section.trim() === '--') {
      continue
    }

    // Разделяем заголовки и тело части
    const headerBodySplit = section.split(/\r?\n\r?\n/)
    if (headerBodySplit.length < 2) {
      continue
    }

    const headers = headerBodySplit[0]
    const content = headerBodySplit.slice(1).join('\n\n').trim()

    // Извлекаем Content-Type
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n;]+)/i)
    const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : ''

    // Извлекаем Content-Transfer-Encoding
    const encodingMatch = headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i)
    const encoding = encodingMatch ? encodingMatch[1].trim().toLowerCase() : ''

    if (contentType) {
      parts.push({ contentType, encoding, content })
    }
  }

  return parts
}

/**
 * Получить тело письма (HTML или plain text)
 */
export function getMessageBody(message: MailhogMessage): string {
  // Если есть MIME части, ищем HTML или plain text
  if (message.Content.MIME?.Parts && message.Content.MIME.Parts.length > 0) {
    for (const part of message.Content.MIME.Parts) {
      const contentType = part.Headers['Content-Type']?.[0] || ''
      const transferEncoding = part.Headers['Content-Transfer-Encoding']?.[0] || ''

      if (contentType.includes('text/html')) {
        let body = part.Body
        // Декодируем если Quoted-Printable
        if (transferEncoding.toLowerCase() === 'quoted-printable') {
          body = decodeQuotedPrintable(body)
        }
        return body
      }
    }
    // Если нет HTML, берём первую часть
    if (message.Content.MIME.Parts.length > 0) {
      const part = message.Content.MIME.Parts[0]
      const transferEncoding = part.Headers['Content-Transfer-Encoding']?.[0] || ''
      let body = part.Body

      if (transferEncoding.toLowerCase() === 'quoted-printable') {
        body = decodeQuotedPrintable(body)
      } else if (transferEncoding.toLowerCase() === 'base64') {
        body = Buffer.from(body, 'base64').toString('utf-8')
      }

      return body
    }
  }

  // Проверяем, является ли Content.Body сырым multipart MIME
  const rawBody = message.Content.Body
  if (rawBody.includes('----_') && rawBody.includes('Content-Type:')) {
    const parts = parseRawMultipartMime(rawBody)

    // Ищем HTML часть
    for (const part of parts) {
      if (part.contentType.includes('text/html')) {
        let content = part.content
        if (part.encoding === 'base64') {
          content = Buffer.from(content.replace(/\s/g, ''), 'base64').toString('utf-8')
        } else if (part.encoding === 'quoted-printable') {
          content = decodeQuotedPrintable(content)
        }
        return content
      }
    }

    // Если нет HTML, берём первую текстовую часть
    for (const part of parts) {
      if (part.contentType.includes('text/')) {
        let content = part.content
        if (part.encoding === 'base64') {
          content = Buffer.from(content.replace(/\s/g, ''), 'base64').toString('utf-8')
        } else if (part.encoding === 'quoted-printable') {
          content = decodeQuotedPrintable(content)
        }
        return content
      }
    }
  }

  // Fallback на основное тело
  return rawBody
}

/**
 * Проверить, доступен ли Mailhog
 */
export async function isMailhogAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${MAILHOG_API_URL}/v2/messages`, {
      method: 'GET',
      // Короткий таймаут для проверки доступности
      signal: AbortSignal.timeout(2000),
    })
    return response.ok
  } catch {
    return false
  }
}
