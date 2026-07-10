/**
 * Человекочитаемые описания сетевых ошибок для показа пользователю
 *
 * net.fetch (Electron/Chromium) кидает ошибки вида "net::ERR_FAILED",
 * обычный Node fetch (undici) — "fetch failed"/"ECONNRESET" и т.д.
 * Оба варианта сами по себе ничего не говорят пользователю — эта функция
 * переводит код ошибки в понятную причину и подсказку.
 */

import * as dns from 'node:dns/promises'
import * as https from 'node:https'
import * as tls from 'node:tls'

/** Коды, которые сами по себе не несут диагностической ценности — для них запускаем зондирование */
const VAGUE_CODES = new Set(['ERR_FAILED', 'fetch failed'])

/** Параметры реального запроса для повтора в диагностике — метод/путь/заголовки/тело как в упавшем net.fetch */
export interface ProbeRequest {
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: string
}

/** Коды ошибок Chromium (net.fetch) → причина на русском */
const CHROMIUM_ERROR_HINTS: Record<string, string> = {
  ERR_NAME_NOT_RESOLVED: 'не удалось разрешить DNS-имя — домен недоступен или заблокирован провайдером',
  ERR_INTERNET_DISCONNECTED: 'нет подключения к интернету',
  ERR_NETWORK_CHANGED: 'сеть изменилась во время запроса, попробуйте ещё раз',
  ERR_CONNECTION_REFUSED: 'сервер отклонил соединение',
  ERR_CONNECTION_RESET: 'соединение сброшено — частый признак блокировки DPI провайдером',
  ERR_CONNECTION_CLOSED: 'соединение закрыто сервером до получения ответа',
  ERR_CONNECTION_TIMED_OUT: 'таймаут соединения',
  ERR_TIMED_OUT: 'таймаут запроса',
  ERR_ADDRESS_UNREACHABLE: 'сервер недоступен по сети',
  ERR_PROXY_CONNECTION_FAILED: 'не удалось подключиться через прокси',
  ERR_TUNNEL_CONNECTION_FAILED: 'прокси/VPN не смог установить туннель до сервера',
  ERR_SSL_PROTOCOL_ERROR: 'ошибка TLS — трафик может подменяться (DPI/MITM)',
  ERR_CERT_COMMON_NAME_INVALID: 'сертификат сервера не совпадает с доменом — похоже на подмену трафика',
  ERR_CERT_AUTHORITY_INVALID: 'сертификату сервера не доверяет система — похоже на VPN/прокси с подменой сертификата',
  ERR_BLOCKED_BY_CLIENT: 'запрос заблокирован локально (антивирус, firewall или расширение)',
  ERR_NETWORK_ACCESS_DENIED: 'доступ к сети запрещён (антивирус, firewall или групповые политики)',
  ERR_FAILED:
    'без деталей — чаще всего это блокировка на уровне провайдера (DPI), VPN/антивирус, либо временный сбой сервера',
}

/** Коды ошибок Node.js (undici fetch) → причина на русском */
const NODE_ERROR_HINTS: Record<string, string> = {
  ECONNRESET: 'соединение сброшено — частый признак блокировки DPI провайдером',
  ETIMEDOUT: 'таймаут соединения',
  ENOTFOUND: 'не удалось разрешить DNS-имя',
  ECONNREFUSED: 'сервер отклонил соединение',
  ENETUNREACH: 'сеть недоступна',
  EAI_AGAIN: 'временный сбой DNS-резолвера',
}

/**
 * Преобразует сырую сетевую ошибку в понятное пользователю сообщение
 *
 * @param error исходная ошибка (Error | DOMException | unknown)
 * @param url URL запроса — используется, чтобы показать домен, к которому не удалось подключиться
 */
export function describeNetError(error: unknown, url?: string): string {
  const raw = error instanceof Error ? error.message : String(error)
  const host = url ? safeHostname(url) : undefined

  const chromiumMatch = /net::([A-Z_0-9]+)/.exec(raw)
  if (chromiumMatch) {
    const code = chromiumMatch[1]
    return buildMessage(code, CHROMIUM_ERROR_HINTS[code] ?? 'сетевая ошибка Chromium без известного описания', host)
  }

  for (const [code, hint] of Object.entries(NODE_ERROR_HINTS)) {
    if (raw.includes(code)) {
      return buildMessage(code, hint, host)
    }
  }

  if (raw.includes('fetch failed')) {
    return buildMessage(
      'fetch failed',
      'сбой сетевого запроса Node.js без деталей — обычно блокировка DPI, VPN или отсутствие интернета',
      host
    )
  }

  if (error instanceof DOMException || raw.toLowerCase().includes('timeout') || raw.toLowerCase().includes('abort')) {
    return buildMessage('TIMEOUT', 'сервер не ответил за отведённое время', host)
  }

  // Неопознанная ошибка — возвращаем как есть, чтобы не потерять диагностику
  return raw
}

function buildMessage(code: string, hint: string, host?: string): string {
  const where = host ? ` до ${host}` : ''
  return `Не удалось подключиться${where}: ${hint} (${code}).\n\nПроверьте интернет-соединение, VPN/прокси и не блокирует ли Animatrona антивирус/firewall.`
}

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

/**
 * Определяет код ошибки (для проверки на "невнятность"), без построения текста
 */
function extractCode(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const chromiumMatch = /net::([A-Z_0-9]+)/.exec(raw)
  if (chromiumMatch) {
    return chromiumMatch[1]
  }
  if (raw.includes('fetch failed')) {
    return 'fetch failed'
  }
  return raw
}

/**
 * Низкоуровневое зондирование хоста в обход Chromium/undici — напрямую через Node dns/tls.
 * Позволяет отличить блокировку на уровне DNS от блокировки на уровне TCP/TLS или HTTP(DPI).
 */
async function diagnoseHost(hostname: string, request?: ProbeRequest): Promise<string> {
  try {
    const addresses = await dns.resolve4(hostname)
    if (addresses.length === 0) {
      return 'DNS вернул пустой ответ на A-запись — домен не резолвится'
    }
  } catch (dnsErr) {
    const msg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr)
    return `DNS не резолвит домен (${msg}) — похоже на блокировку на уровне DNS`
  }

  const tlsResult = await new Promise<'ok' | 'timeout' | string>((resolve) => {
    let settled = false
    const finish = (result: 'ok' | 'timeout' | string) => {
      if (settled) {
        return
      }
      settled = true
      resolve(result)
    }

    // 15с, не 5с — за медленным/перегруженным прокси-узлом рукопожатие может занимать
    // ощутимое время и без блокировки (тот же эффект, что "долгая загрузка" в браузере)
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, timeout: 15_000 })
    socket.on('secureConnect', () => {
      socket.destroy()
      finish('ok')
    })
    socket.on('timeout', () => {
      socket.destroy()
      finish('timeout')
    })
    socket.on('error', (err) => finish(err.message))
  })

  if (tlsResult === 'timeout') {
    return 'DNS резолвится, но TCP/TLS соединение зависает без ответа (таймаут 15с) — похоже на блокировку провайдера (DPI молча дропает пакеты) либо на очень медленный/перегруженный прокси-узел'
  }
  if (tlsResult !== 'ok') {
    return `DNS резолвится, но TCP/TLS соединение падает с ошибкой "${tlsResult}" — похоже на блокировку провайдера (DPI сбрасывает соединение) или firewall/антивирус`
  }

  // TLS прошёл — повторяем РЕАЛЬНЫЙ упавший запрос (метод/путь/заголовки/тело),
  // чтобы отличить блокировку по SNI/IP (TLS бы тоже упал) от блокировки конкретно
  // этого запроса по содержимому — например, антибот-защита сайта (DDoS-Guard и т.п.)
  // может пропускать обычный GET на главную, но резать POST на API-эндпоинт
  return await probeRealRequest(hostname, request)
}

/** Повторяет реальный (упавший в net.fetch) HTTP-запрос через Node https и смотрит, доходит ли ответ */
async function probeRealRequest(hostname: string, request?: ProbeRequest): Promise<string> {
  const method = request?.method ?? 'GET'
  const path = request?.path ?? '/'
  const bodyBuf = request?.body ? Buffer.from(request.body) : undefined
  const headers: Record<string, string> = { ...request?.headers }
  if (bodyBuf) {
    headers['Content-Length'] = String(bodyBuf.length)
  }

  return await new Promise<string>((resolve) => {
    let settled = false
    let gotResponse = false
    let statusCode: number | undefined
    const finish = (result: string) => {
      if (settled) {
        return
      }
      settled = true
      resolve(result)
    }

    // 25с, не 8с — антибот-проверки (DDoS-Guard и т.п.) за медленным прокси могут держать
    // соединение подвешенным ощутимое время перед тем как пропустить, это не блокировка
    const req = https.request({ hostname, port: 443, path, method, headers, timeout: 25_000 }, (res) => {
      gotResponse = true
      statusCode = res.statusCode
      res.resume()
      res.on('end', () => {
        const isRedirect = statusCode !== undefined && statusCode >= 300 && statusCode < 400
        const location = res.headers.location
        finish(
          isRedirect
            ? `Реальный запрос (${method} ${path}) дошёл, но сервер ответил редиректом ${statusCode} → "${location}". ` +
                `fetch() при 301/302 превращает POST в GET и теряет тело запроса — если это домен переехал, нужно обновить основной endpoint в коде`
            : `Реальный запрос (${method} ${path}) через обычный сокет прошёл успешно, сервер ответил ${statusCode} — блокировка, вероятно, непостоянна (rate-limit) либо проблема была временной, попробуйте ещё раз`
        )
      })
    })

    req.on('timeout', () => {
      req.destroy()
      finish(
        gotResponse
          ? `Ответ (${statusCode}) начал приходить, но не завершился за 25с — обрыв в процессе передачи (похоже на блокировку по содержимому потока)`
          : `TLS есть, но именно на запрос ${method} ${path} сервер не отвечает (таймаут 25с) — похоже на блокировку конкретно этого запроса по содержимому (антибот-защита сайта или DPI), либо на очень медленный/перегруженный прокси-узел`
      )
    })
    req.on('error', (err) => {
      finish(
        gotResponse
          ? `Ответ (${statusCode}) начал приходить, но соединение оборвалось ("${err.message}")`
          : `При отправке запроса ${method} ${path} соединение оборвалось ("${err.message}") — похоже на блокировку по содержимому запроса (антибот-защита сайта или DPI)`
      )
    })

    if (bodyBuf) {
      req.write(bodyBuf)
    }
    req.end()
  })
}

/**
 * Асинхронная версия describeNetError — при неклассифицированной ошибке (net::ERR_FAILED,
 * "fetch failed" без деталей) дополнительно зондирует хост напрямую через Node dns/tls,
 * чтобы понять, на каком уровне рвётся соединение (DNS / TCP+TLS / HTTP).
 *
 * Добавляет задержку до ~5с только в случае невнятной ошибки — оправдано, т.к. даёт
 * пользователю реальную причину вместо голого кода.
 */
export async function describeNetErrorWithDiagnostics(
  error: unknown,
  url?: string,
  request?: ProbeRequest
): Promise<string> {
  const base = describeNetError(error, url)
  const host = url ? safeHostname(url) : undefined

  if (!host || !VAGUE_CODES.has(extractCode(error))) {
    return base
  }

  const probeRequest: ProbeRequest = { ...request, path: request?.path ?? safePath(url) }

  try {
    const diagnosis = await diagnoseHost(host, probeRequest)
    return `${base}\n\nДиагностика: ${diagnosis}`
  } catch {
    return base
  }
}

function safePath(url?: string): string | undefined {
  try {
    return url ? new URL(url).pathname : undefined
  } catch {
    return undefined
  }
}
