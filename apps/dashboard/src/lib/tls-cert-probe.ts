/**
 * Прямая проверка срока TLS-сертификата по сетевому адресу — без посредников.
 *
 * Зачем отдельно от NPM: сертификат `mail.letar.best` живёт в Maddy и с NPM не связан вообще, а
 * проверка через API NPM (`ssl-monitor.ts`) после ухода NPM с s2 молча перестала работать.
 * Инцидент 2026-09-20: сертификат почты истёк, а продление тихо не проходило месяц.
 * Смотрим на то, что реально отдаёт сервер клиенту, — так ловится любая причина (не прошло
 * продление, не скопировался файл, не перезапустился сервис).
 */

import tls from 'node:tls'

export interface TlsTarget {
  host: string
  port: number
}

export interface TlsProbeResult {
  /** `host:port` — как цель показана в алерте */
  target: string
  validTo: Date | null
  daysUntilExpiry: number | null
  /** Не удалось получить сертификат: недоступен порт, таймаут, сервер не отдал сертификат */
  error?: string
}

/** Цели по умолчанию: IMAPS и SMTPS одного и того же Maddy — сертификат общий, но порты разные. */
export const DEFAULT_TLS_TARGETS = 'mail.letar.best:993,mail.letar.best:465'

/**
 * Разбор `SSL_CHECK_TARGETS` вида `host:port,host:port`. Некорректные записи отбрасываются
 * молча: лишняя запятая в env не должна ронять всю проверку.
 */
export function parseTlsTargets(raw: string | undefined): TlsTarget[] {
  const source = raw?.trim() ? raw : DEFAULT_TLS_TARGETS
  const targets: TlsTarget[] = []
  for (const part of source.split(',')) {
    const [host, portRaw] = part.trim().split(':')
    const port = Number(portRaw)
    if (host && Number.isInteger(port) && port > 0 && port < 65536) {
      targets.push({ host, port })
    }
  }
  return targets
}

/**
 * Сколько суток до `validTo`; отрицательное — уже истёк. До срока округляем вверх («осталось
 * 12 ч» — это 1 день), после срока — вниз («истёк 23 ч назад» — это -1).
 *
 * ⚠️ Одним `Math.ceil` на всё нельзя: `ceil(-0.96)` даёт `-0`, и сертификат, истёкший вчера,
 * выглядел бы как «истекает сегодня» с серьёзностью ERROR вместо CRITICAL. Так и было в исходной
 * проверке NPM.
 */
export function daysUntil(validTo: Date, now: Date): number {
  const days = (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return days >= 0 ? Math.ceil(days) : Math.floor(days)
}

/**
 * Подключается по TLS и читает срок сертификата, который сервер отдал клиенту.
 *
 * `rejectUnauthorized: false` намеренно: цель проверки — узнать срок, в том числе у уже
 * истёкшего сертификата, а при включённой проверке цепочки соединение с ним просто оборвалось
 * бы ошибкой и срока мы бы не увидели.
 */
export function probeCertificate(
  { host, port }: TlsTarget,
  { timeoutMs = 10_000, now = new Date() }: { timeoutMs?: number; now?: Date } = {},
): Promise<TlsProbeResult> {
  const target = `${host}:${port}`

  return new Promise((resolve) => {
    let settled = false
    const finish = (result: TlsProbeResult): void => {
      if (settled) {
        return
      }
      settled = true
      socket.destroy()
      resolve(result)
    }
    const fail = (error: string): void => finish({ target, validTo: null, daysUntilExpiry: null, error })

    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate()
      const validTo = cert?.valid_to ? new Date(cert.valid_to) : null
      if (!validTo || Number.isNaN(validTo.getTime())) {
        fail('сервер не отдал сертификат или срок нечитаем')
        return
      }
      finish({ target, validTo, daysUntilExpiry: daysUntil(validTo, now) })
    })

    socket.setTimeout(timeoutMs, () => fail(`таймаут ${timeoutMs} мс`))
    socket.on('error', (error) => fail(error.message))
  })
}
