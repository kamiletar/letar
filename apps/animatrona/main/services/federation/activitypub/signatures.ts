/**
 * HTTP Signatures для ActivityPub
 *
 * Реализует HTTP Signature draft standard (draft-cavage-http-signatures)
 * для подписи и верификации запросов между трекерами.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures
 */

import * as crypto from 'crypto'

import type { ParsedSignature, SignatureHeaders, SignedRequestOptions, VerifyOptions, VerifyResult } from './types'

/**
 * Алгоритм подписи
 */
const SIGNATURE_ALGORITHM = 'rsa-sha256'

/**
 * Заголовки, которые подписываем для GET запросов
 */
const GET_SIGNED_HEADERS = ['(request-target)', 'host', 'date']

/**
 * Заголовки, которые подписываем для POST запросов
 */
const POST_SIGNED_HEADERS = ['(request-target)', 'host', 'date', 'digest', 'content-type']

/**
 * Создать подпись для HTTP запроса
 *
 * @param options - Опции подписи
 * @returns Заголовки с подписью
 */
export function signRequest(options: SignedRequestOptions): SignatureHeaders {
  const { method, url, body, privateKeyPem, keyId } = options

  const parsedUrl = new URL(url)
  const host = parsedUrl.host
  const path = parsedUrl.pathname + parsedUrl.search
  const date = new Date().toUTCString()

  const headers: SignatureHeaders = {
    Signature: '',
    Date: date,
  }

  // Формируем строку для подписи
  const signedHeaders = method === 'POST' ? POST_SIGNED_HEADERS : GET_SIGNED_HEADERS
  const signingParts: string[] = []

  for (const header of signedHeaders) {
    switch (header) {
      case '(request-target)':
        signingParts.push(`(request-target): ${method.toLowerCase()} ${path}`)
        break
      case 'host':
        signingParts.push(`host: ${host}`)
        break
      case 'date':
        signingParts.push(`date: ${date}`)
        break
      case 'digest':
        if (body) {
          const digest = createDigest(body)
          headers.Digest = digest
          signingParts.push(`digest: ${digest}`)
        }
        break
      case 'content-type':
        signingParts.push('content-type: application/activity+json')
        break
    }
  }

  const signingString = signingParts.join('\n')

  // Создаём подпись
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingString)
  const signature = sign.sign(privateKeyPem, 'base64')

  // Формируем Signature header
  headers.Signature = [
    `keyId="${keyId}"`,
    `algorithm="${SIGNATURE_ALGORITHM}"`,
    `headers="${signedHeaders.join(' ')}"`,
    `signature="${signature}"`,
  ].join(',')

  return headers
}

/**
 * Верифицировать HTTP подпись
 *
 * @param options - Опции верификации
 * @returns Результат верификации
 */
export function verifySignature(options: VerifyOptions): VerifyResult {
  const { method, path, headers, body, publicKeyPem } = options

  // Парсим Signature header
  const signatureHeader = headers.signature || headers.Signature
  if (!signatureHeader) {
    return { valid: false, error: 'Отсутствует Signature header' }
  }

  const parsed = parseSignatureHeader(signatureHeader)
  if (!parsed) {
    return { valid: false, error: 'Невалидный Signature header' }
  }

  // Проверяем алгоритм
  if (parsed.algorithm !== SIGNATURE_ALGORITHM) {
    return { valid: false, error: `Неподдерживаемый алгоритм: ${parsed.algorithm}` }
  }

  // Проверяем Date header (±5 минут)
  const dateHeader = headers.date || headers.Date
  if (dateHeader) {
    const requestDate = new Date(dateHeader)
    const now = new Date()
    const diff = Math.abs(now.getTime() - requestDate.getTime())
    if (diff > 5 * 60 * 1000) {
      return { valid: false, error: 'Date header устарел (>5 минут)' }
    }
  }

  // Проверяем Digest для POST запросов
  if (body) {
    const digestHeader = headers.digest || headers.Digest
    if (digestHeader) {
      const expectedDigest = createDigest(body)
      if (digestHeader !== expectedDigest) {
        return { valid: false, error: 'Digest не совпадает' }
      }
    }
  }

  // Воссоздаём строку для подписи
  const signingParts: string[] = []
  for (const header of parsed.headers) {
    switch (header) {
      case '(request-target)':
        signingParts.push(`(request-target): ${method.toLowerCase()} ${path}`)
        break
      case 'host':
        signingParts.push(`host: ${headers.host || headers.Host}`)
        break
      case 'date':
        signingParts.push(`date: ${headers.date || headers.Date}`)
        break
      case 'digest':
        signingParts.push(`digest: ${headers.digest || headers.Digest}`)
        break
      case 'content-type':
        signingParts.push(`content-type: ${headers['content-type'] || headers['Content-Type']}`)
        break
      default: {
        // Другие заголовки
        const value = headers[header] || headers[header.toLowerCase()]
        if (value) {
          signingParts.push(`${header}: ${value}`)
        }
      }
    }
  }

  const signingString = signingParts.join('\n')

  // Верифицируем подпись
  try {
    const verify = crypto.createVerify('RSA-SHA256')
    verify.update(signingString)
    const isValid = verify.verify(publicKeyPem, parsed.signature, 'base64')

    return {
      valid: isValid,
      keyId: parsed.keyId,
      error: isValid ? undefined : 'Подпись не прошла верификацию',
    }
  } catch (error) {
    return { valid: false, error: `Ошибка верификации: ${(error as Error).message}` }
  }
}

/**
 * Создать SHA-256 digest для body
 */
function createDigest(body: string): string {
  const hash = crypto.createHash('sha256').update(body).digest('base64')
  return `SHA-256=${hash}`
}

/**
 * Парсить Signature header
 */
function parseSignatureHeader(header: string): ParsedSignature | null {
  try {
    const parts: Record<string, string> = {}

    // Парсим key="value" пары
    const regex = /(\w+)="([^"]+)"/g
    let match
    while ((match = regex.exec(header)) !== null) {
      parts[match[1]] = match[2]
    }

    if (!parts.keyId || !parts.algorithm || !parts.headers || !parts.signature) {
      return null
    }

    return {
      keyId: parts.keyId,
      algorithm: parts.algorithm,
      headers: parts.headers.split(' '),
      signature: parts.signature,
    }
  } catch {
    return null
  }
}

/**
 * Проверить валидность PEM ключа
 */
export function isValidPublicKey(pem: string): boolean {
  try {
    crypto.createPublicKey(pem)
    return true
  } catch {
    return false
  }
}

/**
 * Проверить валидность приватного ключа
 */
export function isValidPrivateKey(pem: string): boolean {
  try {
    crypto.createPrivateKey(pem)
    return true
  } catch {
    return false
  }
}
