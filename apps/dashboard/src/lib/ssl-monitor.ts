/**
 * Проверка сроков действия SSL сертификатов Nginx Proxy Manager.
 *
 * Дополняет визуальные бейджи на `/nginx/certificates` (CertificateCard) проактивным алертом:
 * без этой проверки истечение сертификата обнаруживается только если кто-то зашёл на страницу.
 */

import { AlertSeverity, AlertType, createAlert, getAlertSettings, resolveAlertsByType } from '@/lib/alerts'
import { npmApi } from '@/lib/nginx-proxy-manager'
import { sendNotification } from '@/lib/notifications'

/** Порог "скоро истекает" — совпадает с жёлтым бейджем в CertificateCard */
const EXPIRING_SOON_DAYS = 30
/** Порог повышения серьёзности с WARNING до ERROR */
const EXPIRING_CRITICAL_DAYS = 7

interface ExpiringCertificate {
  domain: string
  daysUntilExpiry: number
}

function daysUntil(expiresOn: string): number {
  const expiresDate = new Date(expiresOn)
  const now = new Date()
  return Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
  error?: string
}

/**
 * Проверяет все сертификаты в NPM. Если хотя бы один истёк или истекает в ближайшие
 * `EXPIRING_SOON_DAYS` дней — создаёт/обновляет единый алерт `SSL_EXPIRING` со списком доменов.
 * Если проблемных сертификатов нет — разрешает активный алерт этого типа (если был).
 */
export async function checkSslCertificates(): Promise<SslCheckResult> {
  let certificates: Awaited<ReturnType<typeof npmApi.getCertificates>>
  try {
    certificates = await npmApi.getCertificates()
  } catch (error) {
    return { checked: 0, expiring: [], error: error instanceof Error ? error.message : 'unknown error' }
  }

  const expiring: ExpiringCertificate[] = certificates
    .map((cert) => ({
      domain: cert.nice_name || cert.domain_names[0] || `cert-${cert.id}`,
      daysUntilExpiry: daysUntil(cert.expires_on),
    }))
    .filter((cert) => cert.daysUntilExpiry <= EXPIRING_SOON_DAYS)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  if (expiring.length === 0) {
    await resolveAlertsByType(AlertType.SSL_EXPIRING)
    return { checked: certificates.length, expiring: [] }
  }

  const worstDays = expiring[0]!.daysUntilExpiry
  const severity =
    worstDays < 0
      ? AlertSeverity.CRITICAL
      : worstDays <= EXPIRING_CRITICAL_DAYS
        ? AlertSeverity.ERROR
        : AlertSeverity.WARNING

  const title =
    expiring.length === 1
      ? `SSL сертификат скоро истекает: ${expiring[0]!.domain}`
      : `SSL: ${expiring.length} сертификата(ов) требуют внимания`
  const message = expiring.map(formatCertLine).join('\n')

  const alert = await createAlert(AlertType.SSL_EXPIRING, severity, title, message, {
    certificates: expiring,
  })

  const settings = await getAlertSettings()
  if (settings.enabled) {
    await sendNotification(alert, settings.telegramEnabled, settings.telegramBotToken, settings.telegramChatId)
  }

  return { checked: certificates.length, expiring }
}
