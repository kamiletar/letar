/**
 * Per-app канареечный мониторинг доставки email для domwellbes.
 *
 * В отличие от общей `email-canary.ts` (шлёт через технический `canary@letar.best` на тот же
 * ящик и на внешний Gmail), эта проверка использует РЕАЛЬНЫЙ SMTP-аккаунт приложения
 * (`SMTP_USER`/`SMTP_PASSWORD` из `apps/domwellbes/.env.docker`, читается через
 * `getAppSmtpConfig` — тот же смонтированный `/secrets/domwellbes.env`, что и `CRON_SECRET`).
 * Так проверяется именно то, что реально ломается у приложения: его собственные SMTP-реквизиты,
 * DKIM для его домена (`noreply@domwellbes.ru`), а не общая инфраструктура Maddy — та уже
 * покрыта `email-canary-check`.
 *
 * Получатель — выделенный служебный ящик `canary-domwellbes@letar.best` на Maddy (заведён
 * 2026-09-05, см. `.claude/docs/maddy-creds-create-missing-imap-acct.md` — нужны И
 * `creds create`, И `imap-acct create`). IMAP-проверка переиспользует `waitForCanaryMessage` из
 * `email-canary.ts` — сам механизм поллинга с жёстким дедлайном не специфичен для глобальной
 * канарейки.
 *
 * Найдено поводом для этой проверки: провижининг login-canary аккаунта domwellbes 28.08.2026
 * упёрся в `501 5.1.1 User does not exist`, потому что ящик тогда не существовал вовсе —
 * инцидент разобран пользователем при жалобе на логин 05.09.2026.
 */

import { createEmailProvider } from '@letar/email'
import { shouldRepeatAlert } from './alert-policy'
import { getAppSmtpConfig } from './app-secrets'
import { postDashboardAlert } from './dashboard-alert'
import { waitForCanaryMessage } from './email-canary'
import { loadJsonState, saveJsonState } from './json-state-file'

export interface DomwellbesEmailCanaryResult {
  token: string
  startedAt: string
  configured: boolean
  sendOk: boolean
  sendError: string | null
  ok: boolean
  latencyMs: number | null
  error: string | null
  folder: string | null
  deliveredToSpam: boolean
  alerted: boolean
}

interface DomwellbesEmailCanaryState {
  consecutiveFailures: number
  alertedAtFailures: number | null
  lastAlertDelivered: boolean | null
}

const STATE_PATH = process.env.DOMWELLBES_EMAIL_CANARY_STATE_PATH
  || '/home/deploy/letar/domwellbes-email-canary-state.json'
const ALERT_THRESHOLD = 2
const CANARY_MAILBOX = 'canary-domwellbes@letar.best'
const CANARY_SUBJECT_MARKER = '[domwellbes-email-canary]'

function defaultState(): DomwellbesEmailCanaryState {
  return { consecutiveFailures: 0, alertedAtFailures: null, lastAlertDelivered: null }
}

function loadState(): DomwellbesEmailCanaryState {
  return { ...defaultState(), ...loadJsonState<Partial<DomwellbesEmailCanaryState>>(STATE_PATH, {}) }
}

/**
 * IMAP-реквизиты служебного ящика `canary-domwellbes@letar.best`. Отдельный секрет
 * (`DOMWELLBES_EMAIL_CANARY_IMAP_PASSWORD`), не переиспользует `EMAIL_CANARY_*` — это другой
 * ящик Maddy со своим паролем.
 */
function getCanaryMailboxImapConfig(): { host: string; port: number; secure: boolean; password: string } | null {
  const password = process.env.DOMWELLBES_EMAIL_CANARY_IMAP_PASSWORD
  if (!password) {
    return null
  }
  return {
    host: process.env.DOMWELLBES_EMAIL_CANARY_IMAP_HOST || 'mail.letar.best',
    port: Number(process.env.DOMWELLBES_EMAIL_CANARY_IMAP_PORT) || 993,
    secure: process.env.DOMWELLBES_EMAIL_CANARY_IMAP_SECURE !== 'false',
    password,
  }
}

async function sendCanaryEmail(token: string): Promise<{ ok: boolean; error: string | null }> {
  const smtp = getAppSmtpConfig('domwellbes')
  if (!smtp) {
    return {
      ok: false,
      error: 'SMTP-реквизиты domwellbes недоступны (/secrets/domwellbes.env не смонтирован или пуст)',
    }
  }

  const provider = createEmailProvider({
    ...smtp,
    fromEmail: smtp.user,
    fromName: 'DomWellbes Email Canary',
  })

  const result = await provider.sendEmail({
    to: CANARY_MAILBOX,
    subject: `${CANARY_SUBJECT_MARKER} ${token}`,
    text: `Канареечная проверка доставки email domwellbes. Токен: ${token}. Отправлено: ${new Date().toISOString()}`,
    html: `<p>Канареечная проверка доставки email domwellbes. Токен: ${token}. Отправлено: ${
      new Date().toISOString()
    }</p>`,
    meta: { type: 'domwellbes-email-canary' },
  })

  return { ok: result.success, error: result.error ?? null }
}

async function notifyCanaryAlert(consecutiveFailures: number, detail: string): Promise<boolean> {
  return await postDashboardAlert({
    type: 'CRON_FAILED',
    severity: 'ERROR',
    title: `Email canary domwellbes: ${consecutiveFailures} подряд неудач`,
    message: detail,
    metadata: { jobId: 'domwellbes-email-canary-check', consecutiveFailures },
  })
}

/**
 * Один прогон — вызывается роутом `/api/cron/domwellbes-email-canary-check`.
 * Не сконфигурирован (нет SMTP domwellbes или пароля от служебного ящика) — не считается
 * провалом, просто не проверяется (тот же принцип, что у внешней ноги `email-canary.ts`).
 */
export async function runDomwellbesEmailCanaryCheck(): Promise<DomwellbesEmailCanaryResult> {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const startedAt = new Date().toISOString()

  const imapConfig = getCanaryMailboxImapConfig()
  const smtpConfig = getAppSmtpConfig('domwellbes')

  if (!imapConfig || !smtpConfig) {
    return {
      token,
      startedAt,
      configured: false,
      sendOk: false,
      sendError: null,
      ok: false,
      latencyMs: null,
      error: null,
      folder: null,
      deliveredToSpam: false,
      alerted: false,
    }
  }

  const { ok: sendOk, error: sendError } = await sendCanaryEmail(token)

  const waitResult = sendOk
    ? await waitForCanaryMessage({
      host: imapConfig.host,
      port: imapConfig.port,
      secure: imapConfig.secure,
      user: CANARY_MAILBOX,
      password: imapConfig.password,
      token,
      purge: true,
    })
    : { ok: false, latencyMs: null, error: sendError, folder: null, deliveredToSpam: false }

  const prevState = loadState()
  const consecutiveFailures = waitResult.ok ? 0 : prevState.consecutiveFailures + 1

  let alerted = false
  let nextState: DomwellbesEmailCanaryState = { ...prevState, consecutiveFailures }

  if (waitResult.ok) {
    nextState = { consecutiveFailures: 0, alertedAtFailures: null, lastAlertDelivered: null }
  } else if (
    shouldRepeatAlert(
      { alertedAtCount: prevState.alertedAtFailures, lastAlertDelivered: prevState.lastAlertDelivered },
      consecutiveFailures,
      ALERT_THRESHOLD,
    )
  ) {
    const delivered = await notifyCanaryAlert(consecutiveFailures, waitResult.error ?? 'Письмо не дошло за таймаут')
    alerted = delivered
    nextState = { consecutiveFailures, alertedAtFailures: consecutiveFailures, lastAlertDelivered: delivered }
  }

  saveJsonState(STATE_PATH, nextState, 'DomwellbesEmailCanary')

  return {
    token,
    startedAt,
    configured: true,
    sendOk,
    sendError,
    ok: waitResult.ok,
    latencyMs: waitResult.latencyMs,
    error: waitResult.error,
    folder: waitResult.folder,
    deliveredToSpam: waitResult.deliveredToSpam,
    alerted,
  }
}

/** Текущее состояние (для GET-статуса) — без запуска новой проверки. */
export function getDomwellbesEmailCanaryState(): DomwellbesEmailCanaryState {
  return loadState()
}
