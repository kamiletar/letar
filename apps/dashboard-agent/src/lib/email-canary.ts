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

import { createEmailProvider } from '@letar/email'
import { ImapFlow } from 'imapflow'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { postDashboardAlert } from './dashboard-alert'

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

  const provider = createEmailProvider({
    host,
    port,
    secure,
    user,
    password,
    fromEmail: user,
    fromName: 'Email Canary',
  })

  const result = await provider.sendEmail({
    to: user,
    ...(externalRecipient && { bcc: externalRecipient }),
    subject: `[email-canary] ${token}`,
    text: `Канареечная проверка доставки email. Токен: ${token}. Отправлено: ${new Date().toISOString()}`,
    html: `<p>Канареечная проверка доставки email. Токен: ${token}. Отправлено: ${new Date().toISOString()}</p>`,
    meta: { type: 'email-canary' },
  })

  return { ok: result.success, error: result.error ?? null }
}

type WaitResult = { ok: boolean; latencyMs: number | null; error: string | null }

/**
 * Ждёт появления письма с токеном в теме во входящих указанного IMAP-ящика.
 * По найденному письму — помечает `\Seen`, чтобы не находить его повторно в следующих прогонах.
 *
 * КРИТИЧНО (инцидент 2026-07-21, см. PLAN.md): ImapFlow на socket-таймауте/обрыве соединения
 * эмитит `'error'` асинхронно — не обязательно как reject уже начатого вызова, а иногда вместо
 * него. Если `'error'` не имеет слушателя, необработанный event на EventEmitter роняет ВЕСЬ
 * процесс dashboard-agent. Но одного слушателя недостаточно: если ошибка происходит ВМЕСТО
 * reject-а уже начатого `await` (например `connect()`/`fetch()`), тот `await` может повиснуть
 * навсегда — слушатель её перехватит, но текущая операция никогда не завершится сама. Поэтому
 * вся функция обёрнута внешним дедлайном (`Promise.race`) — независимо от того, что происходит
 * внутри ImapFlow, вызывающий код гарантированно получает ответ за конечное время.
 */
async function waitForCanaryMessage(opts: {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  token: string
}): Promise<WaitResult> {
  const client = new ImapFlow({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: { user: opts.user, pass: opts.password },
    logger: false,
  })

  let clientError: Error | null = null
  client.on('error', (error: unknown) => {
    clientError = error instanceof Error ? error : new Error(String(error))
  })

  const hardDeadlineMs = POLL_TIMEOUT_MS + 15_000

  const result = await Promise.race([
    waitForCanaryMessageInner(client, opts.token, () => clientError),
    new Promise<WaitResult>((resolve) => {
      setTimeout(() => {
        resolve({
          ok: false,
          latencyMs: null,
          error:
            (clientError as Error | null)?.message ??
            `IMAP-операция не завершилась за ${hardDeadlineMs}мс (зависший сокет)`,
        })
      }, hardDeadlineMs)
    }),
  ])

  // Гасим соединение жёстко (без LOGOUT) — если гонка выиграна таймаутом, штатный logout() в
  // waitForCanaryMessageInner мог не выполниться (или тоже зависнуть на мёртвом сокете).
  client.close()

  return result
}

async function waitForCanaryMessageInner(
  client: ImapFlow,
  token: string,
  getClientError: () => Error | null
): Promise<WaitResult> {
  const startedAt = Date.now()

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX', { acquireTimeout: POLL_TIMEOUT_MS })

    try {
      while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        const clientError = getClientError()
        if (clientError) {
          return { ok: false, latencyMs: null, error: clientError.message }
        }
        for await (const message of client.fetch({ seen: false }, { envelope: true, uid: true })) {
          if (message.envelope?.subject?.includes(token)) {
            await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true })
            return { ok: true, latencyMs: Date.now() - startedAt, error: null }
          }
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      }
      const clientError = getClientError()
      return clientError
        ? { ok: false, latencyMs: null, error: clientError.message }
        : { ok: false, latencyMs: null, error: `Письмо с токеном не пришло за ${POLL_TIMEOUT_MS}мс` }
    } finally {
      await Promise.resolve(lock.release()).catch(() => {
        // соединение уже могло быть разорвано ошибкой выше — не мешаем вернуть результат
      })
    }
  } catch (error) {
    const reported = getClientError() ?? error
    return { ok: false, latencyMs: null, error: reported instanceof Error ? reported.message : 'Unknown IMAP error' }
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
  detail: string
): Promise<void> {
  await postDashboardAlert({
    type: 'CRON_FAILED',
    severity: 'ERROR',
    title: `Email canary: ${consecutiveFailures} подряд неудач (${leg})`,
    message: detail,
    metadata: { jobId: 'email-canary-check', leg, consecutiveFailures },
  })
}

/**
 * Обновляет состояние одной ноги (счётчик подряд-неудач, флаг "уже алертили") и,
 * при первом пересечении порога, шлёт алерт. При успехе счётчик и флаг сбрасываются.
 */
async function updateLegState(
  leg: 'internal' | 'external',
  state: CanaryLegState,
  result: EmailCanaryLegResult
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
