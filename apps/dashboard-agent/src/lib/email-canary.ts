/**
 * Канареечный мониторинг доставки email (Этап 0.7 корневого PLAN.md)
 *
 * Раз в расписание (см. `cron.ts`) отправляет тестовое письмо через реальный SMTP
 * (выделенный ящик `canary@letar.best` на Maddy) и проверяет round-trip:
 * - internal: письмо появляется во входящих того же ящика (жив ли сам Maddy SMTP+IMAP)
 * - external: то же письмо отправляется напрямую на реальный внешний ящик (Gmail и т.п.),
 *   чтобы ловить именно тот класс инцидентов, что стал первопричиной Этапа 0
 *   («форвард режется gmail») — сторонний почтовик может принять SMTP, но зарезать/зафильтровать письмо.
 *
 * External-нога — опциональна: если `EMAIL_CANARY_EXTERNAL_*` не заданы, просто не проверяется
 * (не роняем internal-проверку из-за отсутствия внешнего ящика).
 */

import { ImapFlow } from 'imapflow'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import nodemailer from 'nodemailer'

export interface EmailCanaryLegResult {
  configured: boolean
  ok: boolean
  latencyMs: number | null
  error: string | null
}

export interface EmailCanaryRunResult {
  token: string
  startedAt: string
  sendOk: boolean
  sendError: string | null
  internal: EmailCanaryLegResult
  external: EmailCanaryLegResult
  alertsSent: string[]
}

interface CanaryLegState {
  consecutiveFailures: number
  alerted: boolean
  lastCheckedAt: string | null
  lastOk: boolean | null
  lastLatencyMs: number | null
}

interface CanaryRunHistoryEntry {
  ts: string
  internal: EmailCanaryLegResult
  external: EmailCanaryLegResult
}

interface CanaryState {
  internal: CanaryLegState
  external: CanaryLegState
  history: CanaryRunHistoryEntry[]
}

const STATE_PATH = process.env.EMAIL_CANARY_STATE_PATH || '/home/deploy/letar/email-canary-state.json'
const MAX_HISTORY = 30
const ALERT_THRESHOLD = 3
const POLL_TIMEOUT_MS = 90_000
const POLL_INTERVAL_MS = 5_000

function defaultLegState(): CanaryLegState {
  return { consecutiveFailures: 0, alerted: false, lastCheckedAt: null, lastOk: null, lastLatencyMs: null }
}

function loadState(): CanaryState {
  try {
    if (existsSync(STATE_PATH)) {
      const parsed = JSON.parse(readFileSync(STATE_PATH, 'utf-8')) as Partial<CanaryState>
      return {
        internal: parsed.internal ?? defaultLegState(),
        external: parsed.external ?? defaultLegState(),
        history: parsed.history ?? [],
      }
    }
  } catch (error) {
    console.error('[EmailCanary] Не удалось прочитать состояние, начинаем с чистого листа:', error)
  }
  return { internal: defaultLegState(), external: defaultLegState(), history: [] }
}

function saveState(state: CanaryState): void {
  try {
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8')
  } catch (error) {
    console.error('[EmailCanary] Не удалось сохранить состояние:', error)
  }
}

/**
 * Отправляет письмо-канарейку через SMTP выделенного ящика `canary@letar.best`.
 * Получатель — сам канареечный ящик (internal-нога); внешний ящик (если задан)
 * получает копию через BCC — так обе ноги проверяются одним письмом.
 */
async function sendCanaryEmail(token: string): Promise<{ ok: boolean; error: string | null }> {
  const host = process.env.EMAIL_CANARY_SMTP_HOST || 'mail.letar.best'
  const port = Number(process.env.EMAIL_CANARY_SMTP_PORT) || 587
  const secure = process.env.EMAIL_CANARY_SMTP_SECURE === 'true'
  const user = process.env.EMAIL_CANARY_SMTP_USER
  const password = process.env.EMAIL_CANARY_SMTP_PASSWORD
  const externalRecipient = process.env.EMAIL_CANARY_EXTERNAL_RECIPIENT

  if (!user || !password) {
    return { ok: false, error: 'EMAIL_CANARY_SMTP_USER/EMAIL_CANARY_SMTP_PASSWORD не заданы' }
  }

  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
      greetingTimeout: 5_000,
    })

    await transport.sendMail({
      from: `"Email Canary" <${user}>`,
      to: user,
      ...(externalRecipient && { bcc: externalRecipient }),
      subject: `[email-canary] ${token}`,
      text: `Канареечная проверка доставки email. Токен: ${token}. Отправлено: ${new Date().toISOString()}`,
    })

    return { ok: true, error: null }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown SMTP error' }
  }
}

/**
 * Ждёт появления письма с токеном в теме во входящих указанного IMAP-ящика.
 * По найденному письму — помечает `\Seen`, чтобы не находить его повторно в следующих прогонах.
 */
async function waitForCanaryMessage(opts: {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  token: string
}): Promise<{ ok: boolean; latencyMs: number | null; error: string | null }> {
  const startedAt = Date.now()
  const client = new ImapFlow({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: { user: opts.user, pass: opts.password },
    logger: false,
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        for await (const message of client.fetch({ seen: false }, { envelope: true, uid: true })) {
          if (message.envelope?.subject?.includes(opts.token)) {
            await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true })
            return { ok: true, latencyMs: Date.now() - startedAt, error: null }
          }
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      }
      return { ok: false, latencyMs: null, error: `Письмо с токеном не пришло за ${POLL_TIMEOUT_MS}мс` }
    } finally {
      lock.release()
    }
  } catch (error) {
    return { ok: false, latencyMs: null, error: error instanceof Error ? error.message : 'Unknown IMAP error' }
  } finally {
    await client.logout().catch(() => {
      // соединение уже могло быть разорвано ошибкой выше — не мешаем вернуть результат
    })
  }
}

async function checkInternalLeg(token: string): Promise<EmailCanaryLegResult> {
  const host = process.env.EMAIL_CANARY_SMTP_HOST || 'mail.letar.best'
  const user = process.env.EMAIL_CANARY_SMTP_USER
  const password = process.env.EMAIL_CANARY_SMTP_PASSWORD

  if (!user || !password) {
    return { configured: false, ok: false, latencyMs: null, error: null }
  }

  const result = await waitForCanaryMessage({
    host: process.env.EMAIL_CANARY_INTERNAL_IMAP_HOST || host,
    port: Number(process.env.EMAIL_CANARY_INTERNAL_IMAP_PORT) || 993,
    secure: process.env.EMAIL_CANARY_INTERNAL_IMAP_SECURE !== 'false',
    user,
    password,
    token,
  })

  return { configured: true, ...result }
}

async function checkExternalLeg(token: string): Promise<EmailCanaryLegResult> {
  const user = process.env.EMAIL_CANARY_EXTERNAL_IMAP_USER
  const password = process.env.EMAIL_CANARY_EXTERNAL_IMAP_PASSWORD
  const host = process.env.EMAIL_CANARY_EXTERNAL_IMAP_HOST

  if (!user || !password || !host) {
    // Внешняя нога не сконфигурирована — не считается провалом, просто не проверяется
    return { configured: false, ok: false, latencyMs: null, error: null }
  }

  const result = await waitForCanaryMessage({
    host,
    port: Number(process.env.EMAIL_CANARY_EXTERNAL_IMAP_PORT) || 993,
    secure: process.env.EMAIL_CANARY_EXTERNAL_IMAP_SECURE !== 'false',
    user,
    password,
    token,
  })

  return { configured: true, ...result }
}

/**
 * Уведомляет dashboard о срыве канареечной проверки (переиспользует существующий alert-pipeline
 * `POST /api/alerts` типа CRON_FAILED — заводить отдельный AlertType/миграцию ради этого не стали,
 * см. PLAN.md Этап 0.7).
 */
async function notifyCanaryAlert(
  leg: 'internal' | 'external',
  consecutiveFailures: number,
  detail: string,
): Promise<void> {
  try {
    const host = process.env.DASHBOARD_HOST ?? 'dashboard-app'
    const url = `http://${host}:3002/api/alerts`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': process.env.CRON_SECRET || 'default-cron-secret',
      },
      body: JSON.stringify({
        type: 'CRON_FAILED',
        severity: 'ERROR',
        title: `Email canary: ${consecutiveFailures} подряд неудач (${leg})`,
        message: detail,
        metadata: { jobId: 'email-canary-check', leg, consecutiveFailures },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
  } catch (error) {
    console.error('[EmailCanary] Не удалось отправить alert в dashboard:', error)
  }
}

/**
 * Обновляет состояние одной ноги (счётчик подряд-неудач, флаг "уже алертили") и,
 * при первом пересечении порога, шлёт алерт. При успехе счётчик и флаг сбрасываются.
 */
async function updateLegState(
  leg: 'internal' | 'external',
  state: CanaryLegState,
  result: EmailCanaryLegResult,
): Promise<{ state: CanaryLegState; alerted: boolean }> {
  if (!result.configured) {
    return { state, alerted: false }
  }

  const next: CanaryLegState = {
    consecutiveFailures: result.ok ? 0 : state.consecutiveFailures + 1,
    alerted: result.ok ? false : state.alerted,
    lastCheckedAt: new Date().toISOString(),
    lastOk: result.ok,
    lastLatencyMs: result.latencyMs,
  }

  if (!result.ok && next.consecutiveFailures >= ALERT_THRESHOLD && !state.alerted) {
    await notifyCanaryAlert(leg, next.consecutiveFailures, result.error ?? 'Письмо не дошло за таймаут')
    next.alerted = true
    return { state: next, alerted: true }
  }

  return { state: next, alerted: false }
}

/**
 * Один прогон канареечной проверки — вызывается роутом `/api/cron/email-canary-check`.
 */
export async function runEmailCanaryCheck(): Promise<EmailCanaryRunResult> {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const startedAt = new Date().toISOString()

  const { ok: sendOk, error: sendError } = await sendCanaryEmail(token)

  // Обе ноги проверяем параллельно — они независимы. Если отправка не удалась, проверять
  // прибытие письма бессмысленно — сразу отдаём провал (но сохраняем флаг configured).
  const [internal, external]: [EmailCanaryLegResult, EmailCanaryLegResult] = sendOk
    ? await Promise.all([checkInternalLeg(token), checkExternalLeg(token)])
    : [
      { configured: Boolean(process.env.EMAIL_CANARY_SMTP_USER), ok: false, latencyMs: null, error: sendError },
      {
        configured: Boolean(process.env.EMAIL_CANARY_EXTERNAL_IMAP_USER),
        ok: false,
        latencyMs: null,
        error: sendError,
      },
    ]

  const prevState = loadState()
  const alertsSent: string[] = []

  const internalUpdate = await updateLegState('internal', prevState.internal, internal)
  if (internalUpdate.alerted) {
    alertsSent.push('internal')
  }

  const externalUpdate = await updateLegState('external', prevState.external, external)
  if (externalUpdate.alerted) {
    alertsSent.push('external')
  }

  const history = [{ ts: startedAt, internal, external }, ...prevState.history].slice(0, MAX_HISTORY)

  saveState({ internal: internalUpdate.state, external: externalUpdate.state, history })

  return { token, startedAt, sendOk, sendError, internal, external, alertsSent }
}

/**
 * Текущее состояние (для GET /api/cron/email-canary-check/status) — без запуска новой проверки.
 */
export function getEmailCanaryState(): CanaryState {
  return loadState()
}
