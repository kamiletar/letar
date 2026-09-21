/**
 * Проверка сроков действия SSL/TLS-сертификатов.
 *
 * Источников два:
 * - **прямые TLS-подключения** к адресам из `SSL_CHECK_TARGETS` (по умолчанию `mail.letar.best`,
 *   порты 993 и 465) — основной источник, работает без посредников (`tls-cert-probe.ts`);
 * - **Nginx Proxy Manager** — необязательный: с s2 и s1 NPM снят, а до 2026-09-21 проверка была
 *   ТОЛЬКО через него и молча ничего не проверяла (`ENOTFOUND` уходил в `error` без алерта),
 *   поэтому сертификат почты, которого в NPM никогда не было, истёк незамеченным.
 *
 * Дополняет визуальные бейджи на `/nginx/certificates` (CertificateCard) проактивным алертом.
 */

import {
  AlertSeverity,
  AlertType,
  createAlert,
  getAlertSettings,
  markAlertNotified,
  resolveAlertsByType,
} from '@/lib/alerts'
import { npmApi } from '@/lib/nginx-proxy-manager'
import { sendNotification } from '@/lib/notifications'
import { daysUntil, parseTlsTargets, probeCertificate, type TlsProbeResult } from '@/lib/tls-cert-probe'

/** Порог "скоро истекает" — совпадает с жёлтым бейджем в CertificateCard */
const EXPIRING_SOON_DAYS = 30
/** Порог повышения серьёзности с WARNING до ERROR */
const EXPIRING_CRITICAL_DAYS = 7

export interface ExpiringCertificate {
  domain: string
  daysUntilExpiry: number
}

function formatCertLine({ domain, daysUntilExpiry }: ExpiringCertificate): string {
  if (daysUntilExpiry < 0) {
    return `• ${domain} — истёк ${Math.abs(daysUntilExpiry)} дн. назад`
  }
  if (daysUntilExpiry === 0) {
    return `• ${domain} — истекает сегодня`
  }
  return `• ${domain} — истекает через ${daysUntilExpiry} дн.`
}

export interface SslCheckResult {
  checked: number
  expiring: ExpiringCertificate[]
  /** Цели прямой проверки, до которых не удалось достучаться (`host:port — причина`) */
  probeErrors: string[]
  /** NPM недоступен — не ошибка проверки, а штатная ситуация после ухода NPM с сервера */
  npmError?: string
}

/** Сертификаты NPM. Недоступность NPM не ломает проверку — источник необязательный. */
async function loadNpmCertificates(): Promise<{ certificates: ExpiringCertificate[]; error?: string }> {
  try {
    const certificates = await npmApi.getCertificates()
    return {
      certificates: certificates.map((cert) => ({
        domain: cert.nice_name || cert.domain_names[0] || `cert-${cert.id}`,
        daysUntilExpiry: daysUntil(new Date(cert.expires_on), new Date()),
      })),
    }
  } catch (error) {
    return { certificates: [], error: error instanceof Error ? error.message : 'unknown error' }
  }
}

function probeToCertificate(result: TlsProbeResult): ExpiringCertificate | null {
  return result.daysUntilExpiry === null ? null : { domain: result.target, daysUntilExpiry: result.daysUntilExpiry }
}

/**
 * Проверяет все источники. Если хотя бы один сертификат истёк или истекает в ближайшие
 * `EXPIRING_SOON_DAYS` дней — создаёт/обновляет единый алерт `SSL_EXPIRING` со списком.
 *
 * Активный алерт закрывается ТОЛЬКО когда проблемных сертификатов нет И все цели прямой проверки
 * отработали: если до почтового сервера достучаться не вышло, «всё в порядке» мы не знаем, и
 * закрывать алерт нельзя — иначе недоступность закрыла бы предупреждение об истёкшем сертификате.
 */
export async function checkSslCertificates(): Promise<SslCheckResult> {
  const targets = parseTlsTargets(process.env.SSL_CHECK_TARGETS)
  const [npm, probes] = await Promise.all([
    loadNpmCertificates(),
    Promise.all(targets.map((target) => probeCertificate(target))),
  ])

  const probeErrors = probes.filter((probe) => probe.error).map((probe) => `${probe.target} — ${probe.error}`)
  const probed = probes.map(probeToCertificate).filter((cert): cert is ExpiringCertificate => cert !== null)
  const all = [...npm.certificates, ...probed]

  const expiring = all
    .filter((cert) => cert.daysUntilExpiry <= EXPIRING_SOON_DAYS)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  const result: SslCheckResult = { checked: all.length, expiring, probeErrors, npmError: npm.error }

  if (expiring.length === 0) {
    if (probeErrors.length === 0) {
      await resolveAlertsByType(AlertType.SSL_EXPIRING)
    }
    return result
  }

  const worstDays = expiring[0]!.daysUntilExpiry
  const severity = worstDays < 0
    ? AlertSeverity.CRITICAL
    : worstDays <= EXPIRING_CRITICAL_DAYS
    ? AlertSeverity.ERROR
    : AlertSeverity.WARNING

  const title = expiring.length === 1
    ? `SSL сертификат скоро истекает: ${expiring[0]!.domain}`
    : `SSL: ${expiring.length} сертификата(ов) требуют внимания`
  const message = expiring.map(formatCertLine).join('\n')

  const alert = await createAlert(AlertType.SSL_EXPIRING, severity, title, message, {
    certificates: expiring,
  })

  const settings = await getAlertSettings()
  if (settings.enabled) {
    const sent = await sendNotification(
      alert,
      settings.telegramEnabled,
      settings.telegramBotToken,
      settings.telegramChatId,
    )
    await markAlertNotified(alert.id, sent)
  }

  return result
}
