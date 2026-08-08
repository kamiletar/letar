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
 *
 * ⚠️ Письмо ищется во ВСЕХ папках ящика, а не только во входящих, и найденное в спаме считается
 * доставленным — с отдельным предупреждением. Проверка только INBOX держала внешнюю ногу красной
 * 17 дней подряд при полностью исправной почте: Gmail принимал все письма и клал их в спам
 * (§62 PLAN-INFRA.md).
 */

import { createEmailProvider } from '@letar/email'
import { ImapFlow } from 'imapflow'
import { postDashboardAlert } from './dashboard-alert'
import { loadJsonState, saveJsonState } from './json-state-file'

export interface EmailCanaryLegResult {
  configured: boolean
  ok: boolean
  latencyMs: number | null
  error: string | null
  /** Папка, в которой нашлось письмо (`null` — не найдено). Не только INBOX, см. §62. */
  folder?: string | null
  /** Письмо дошло, но легло в спам — доставка формально есть, до человека письмо не дойдёт. */
  deliveredToSpam?: boolean
}

/** Минимум, который нужен от `client.list()`, чтобы отличить спам-папку. */
export interface MailboxInfo {
  path: string
  specialUse?: string
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

export interface CanaryLegState {
  consecutiveFailures: number
  /**
   * При скольки подряд-неудачах уходил последний алерт (`null` — ещё ни разу).
   * Заменил булев `alerted`: тот взводился однажды и глушил уведомления навсегда (§62).
   */
  alertedAtFailures: number | null
  lastAlertAt: string | null
  /** Подтвердил ли dashboard приём последнего алерта. `false` → повторяем каждый прогон. */
  lastAlertDelivered: boolean | null
  lastCheckedAt: string | null
  lastOk: boolean | null
  lastLatencyMs: number | null
  lastFolder: string | null
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
/** Общая часть темы всех канареечных писем — по ней же чистится служебный ящик. */
const CANARY_SUBJECT_MARKER = '[email-canary]'
/** Насколько старые канареечные письма удалять из служебного ящика при каждой удачной проверке. */
const PURGE_OLDER_THAN_MS = 24 * 60 * 60 * 1000

export function defaultLegState(): CanaryLegState {
  return {
    consecutiveFailures: 0,
    alertedAtFailures: null,
    lastAlertAt: null,
    lastAlertDelivered: null,
    lastCheckedAt: null,
    lastOk: null,
    lastLatencyMs: null,
    lastFolder: null,
  }
}

/**
 * Спам-папка ящика. Сначала по IMAP special-use — он не зависит от языка интерфейса
 * (`[Gmail]/Спам`, `Junk E-Mail`, `Bulk Mail` — всё это `\Junk`), потом по имени как запасной путь.
 */
export function isSpamMailbox(box: MailboxInfo): boolean {
  if (box.specialUse === '\\Junk') {
    return true
  }
  return /spam|junk|спам/i.test(box.path)
}

/**
 * Нужно ли слать алерт по итогам этого прогона.
 *
 * Правило §62: молчание не наступает никогда, пока проблема жива.
 * - первый раз — при пересечении порога;
 * - дальше — при каждом удвоении числа неудач (3, 6, 12, 24…), чтобы не спамить, но и не пропадать;
 * - если прошлый алерт не подтверждён dashboard'ом — повторяем на каждом прогоне, потому что
 *   «отправили и потеряли» ничем не лучше, чем «не отправляли».
 */
export function shouldSendAlert(
  state: CanaryLegState,
  result: EmailCanaryLegResult,
  threshold: number,
): boolean {
  if (!result.configured || result.ok) {
    return false
  }
  if (state.consecutiveFailures < threshold) {
    return false
  }
  if (state.alertedAtFailures === null) {
    return true
  }
  if (state.lastAlertDelivered === false) {
    return true
  }
  return state.consecutiveFailures >= state.alertedAtFailures * 2
}

function loadState(): CanaryState {
  const parsed = loadJsonState<Partial<CanaryState>>(STATE_PATH, {})
  return {
    // Слияние с дефолтом обязательно, а не `?? defaultLegState()`: на диске лежит состояние
    // старой формы (булев `alerted`, без полей повторного алерта). Без слияния новые поля
    // остались бы `undefined`, `shouldSendAlert` свалился бы в сравнение с NaN и молчал бы
    // навсегда — ровно тот отказ, который здесь и чинится (§62).
    internal: { ...defaultLegState(), ...parsed.internal },
    external: { ...defaultLegState(), ...parsed.external },
    history: parsed.history ?? [],
  }
}

function saveState(state: CanaryState): void {
  saveJsonState(STATE_PATH, state, 'EmailCanary')
}

/**
 * Отправляет письмо-канарейку через SMTP выделенного ящика `canary@letar.best`.
 * Получателей двое и оба в `To:` — сам канареечный ящик (internal-нога) и внешний ящик,
 * если задан (external-нога). Одно письмо проверяет обе ноги.
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

  // Оба получателя — в `To:`, одним письмом.
  //
  // Раньше внешний ящик получал скрытую копию, и это была главная причина, по которой Gmail
  // клал канарейку в спам: получателя нет ни в `To:`, ни в `Cc:`, тема повторяется каждые 15
  // минут. 1684 письма подряд ушли в спам, ни одного в INBOX (§62). Адреса служебные, скрывать
  // их друг от друга незачем.
  const recipients = externalRecipient ? `${user}, ${externalRecipient}` : user

  const result = await provider.sendEmail({
    to: recipients,
    subject: `${CANARY_SUBJECT_MARKER} ${token}`,
    text: `Канареечная проверка доставки email. Токен: ${token}. Отправлено: ${new Date().toISOString()}`,
    html: `<p>Канареечная проверка доставки email. Токен: ${token}. Отправлено: ${new Date().toISOString()}</p>`,
    meta: { type: 'email-canary' },
  })

  return { ok: result.success, error: result.error ?? null }
}

type WaitResult = {
  ok: boolean
  latencyMs: number | null
  error: string | null
  folder: string | null
  deliveredToSpam: boolean
}

function failedWait(error: string): WaitResult {
  return { ok: false, latencyMs: null, error, folder: null, deliveredToSpam: false }
}

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
  /** Удалять найденное письмо и старый мусор. Только для служебного ящика, не для чужого. */
  purge: boolean
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
    waitForCanaryMessageInner(client, opts.token, opts.purge, () => clientError),
    new Promise<WaitResult>((resolve) => {
      setTimeout(() => {
        resolve(failedWait(
          (clientError as Error | null)?.message
            ?? `IMAP-операция не завершилась за ${hardDeadlineMs}мс (зависший сокет)`,
        ))
      }, hardDeadlineMs)
    }),
  ])

  // Гасим соединение жёстко (без LOGOUT) — если гонка выиграна таймаутом, штатный logout() в
  // waitForCanaryMessageInner мог не выполниться (или тоже зависнуть на мёртвом сокете).
  client.close()

  return result
}

interface FoundMessage {
  folder: string
  uid: number
  spam: boolean
}

/** Папки, которые вообще можно выбрать. `\Noselect` — контейнеры вроде `[Gmail]`, в них не ищут. */
async function listSelectableMailboxes(client: ImapFlow): Promise<MailboxInfo[]> {
  const boxes = await client.list()
  return boxes
    .filter((box) => !box.flags?.has('\\Noselect'))
    .map((box) => ({ path: box.path, specialUse: box.specialUse }))
}

/**
 * Ищет письмо с токеном в перечисленных папках серверным `SEARCH` по теме.
 *
 * Раньше здесь был `fetch({ seen: false })` с перебором конвертов на клиенте — он и ограничивал
 * поиск одним INBOX, и тянул через сеть все непрочитанные письма ящика. `SEARCH` отдаёт сразу
 * UID нужного письма, поэтому размер ящика на проверку больше не влияет.
 */
async function findTokenInMailboxes(
  client: ImapFlow,
  mailboxes: MailboxInfo[],
  token: string,
): Promise<FoundMessage | null> {
  for (const box of mailboxes) {
    try {
      const lock = await client.getMailboxLock(box.path, { acquireTimeout: POLL_INTERVAL_MS })
      try {
        const uids = await client.search({ subject: token }, { uid: true })
        if (uids && uids.length > 0) {
          return { folder: box.path, uid: uids[uids.length - 1], spam: isSpamMailbox(box) }
        }
      } finally {
        lock.release()
      }
    } catch {
      // папка недоступна для выборки (права, гонка с реиндексацией) — она не должна ронять проверку
    }
  }
  return null
}

/**
 * Закрывает найденное письмо: помечает прочитанным, а в служебном ящике — удаляет вместе со
 * старым канареечным мусором.
 *
 * ⚠️ Вызывается СТРОГО после того, как поиск завершён и лок отпущен. В прежней версии
 * `messageFlagsAdd` стоял внутри активного `for await (… client.fetch())`, то есть команда
 * уходила в соединение, занятое незакрытым FETCH, а следом сразу шли `return` → `logout()`.
 * Флаг не выставлялся ни разу за 17 дней: 1695 писем, все непрочитанные (§62).
 */
async function settleFoundMessage(client: ImapFlow, found: FoundMessage, purge: boolean): Promise<void> {
  try {
    const lock = await client.getMailboxLock(found.folder)
    try {
      await client.messageFlagsAdd(found.uid, ['\\Seen'], { uid: true })

      if (purge) {
        await client.messageDelete(found.uid, { uid: true })
        await purgeOldCanaryMessages(client)
      }
    } finally {
      lock.release()
    }
  } catch (error) {
    // Уборка не влияет на вердикт проверки: письмо дошло — это главное, что канарейка измеряет.
    console.error('[EmailCanary] не удалось прибрать найденное письмо:', error)
  }
}

/**
 * Чистит служебный ящик от канареечных писем старше суток — вызывается при уже взятом локе.
 * Без неё ящик рос на 96 писем в день и не чистился ничем: к разбору §62 в нём лежало 1695 писем.
 */
async function purgeOldCanaryMessages(client: ImapFlow): Promise<void> {
  const before = new Date(Date.now() - PURGE_OLDER_THAN_MS)
  const stale = await client.search({ subject: CANARY_SUBJECT_MARKER, before }, { uid: true })
  if (stale && stale.length > 0) {
    await client.messageDelete(stale, { uid: true })
  }
}

async function waitForCanaryMessageInner(
  client: ImapFlow,
  token: string,
  purge: boolean,
  getClientError: () => Error | null,
): Promise<WaitResult> {
  const startedAt = Date.now()

  try {
    await client.connect()

    const all = await listSelectableMailboxes(client)
    // Каждую итерацию опрашиваем только вероятные папки — INBOX и спам. Полный обход стоит
    // SELECT+SEARCH на папку, и гонять его каждые 5 секунд по всему ящику незачем.
    const likely = all.filter((box) => box.path.toUpperCase() === 'INBOX' || isSpamMailbox(box))
    const priority = likely.length > 0 ? likely : all

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      const clientError = getClientError()
      if (clientError) {
        return failedWait(clientError.message)
      }

      const found = await findTokenInMailboxes(client, priority, token)
      if (found) {
        await settleFoundMessage(client, found, purge)
        return {
          ok: true,
          latencyMs: Date.now() - startedAt,
          error: null,
          folder: found.folder,
          deliveredToSpam: found.spam,
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }

    const clientError = getClientError()
    if (clientError) {
      return failedWait(clientError.message)
    }

    // Последний шанс: письмо могло уехать в пользовательскую папку фильтром на стороне провайдера.
    // Один полный обход в конце дешевле, чем на каждой итерации, и снимает слепоту окончательно.
    const anywhere = await findTokenInMailboxes(client, all, token)
    if (anywhere) {
      await settleFoundMessage(client, anywhere, purge)
      return {
        ok: true,
        latencyMs: Date.now() - startedAt,
        error: null,
        folder: anywhere.folder,
        deliveredToSpam: anywhere.spam,
      }
    }

    return failedWait(`Письмо с токеном не пришло за ${POLL_TIMEOUT_MS}мс (проверены все папки)`)
  } catch (error) {
    const reported = getClientError() ?? error
    return failedWait(reported instanceof Error ? reported.message : 'Unknown IMAP error')
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
    // Служебный ящик целиком наш — здесь чистим за собой.
    purge: true,
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
    // Чужой ящик — ничего не удаляем, только помечаем прочитанным.
    purge: false,
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
): Promise<boolean> {
  return await postDashboardAlert({
    type: 'CRON_FAILED',
    severity: 'ERROR',
    title: `Email canary: ${consecutiveFailures} подряд неудач (${leg})`,
    message: detail,
    metadata: { jobId: 'email-canary-check', leg, consecutiveFailures },
  })
}

/**
 * Отдельный сигнал: письмо дошло, но легло в спам. Формально доставка есть — до человека письмо
 * не дойдёт. Именно это состояние 17 дней выглядело как «внешняя нога сломана» (§62).
 */
async function notifySpamDelivery(leg: 'internal' | 'external', folder: string): Promise<void> {
  await postDashboardAlert({
    type: 'CRON_FAILED',
    severity: 'WARNING',
    title: `Email canary: письмо доставлено в спам (${leg})`,
    message: `Письмо дошло, но попало в папку «${folder}», а не во входящие. `
      + 'Доставка формально работает, до получателя письмо не дойдёт.',
    metadata: { jobId: 'email-canary-check', leg, folder, deliveredToSpam: true },
  })
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
    ...state,
    consecutiveFailures: result.ok ? 0 : state.consecutiveFailures + 1,
    lastCheckedAt: new Date().toISOString(),
    lastOk: result.ok,
    lastLatencyMs: result.latencyMs,
    lastFolder: result.folder ?? null,
  }

  if (result.ok) {
    // Успех обнуляет историю уведомлений — следующая серия начнётся с чистого листа.
    next.alertedAtFailures = null
    next.lastAlertDelivered = null

    if (result.deliveredToSpam && result.folder) {
      await notifySpamDelivery(leg, result.folder)
    }

    return { state: next, alerted: false }
  }

  if (!shouldSendAlert(next, result, ALERT_THRESHOLD)) {
    return { state: next, alerted: false }
  }

  const delivered = await notifyCanaryAlert(
    leg,
    next.consecutiveFailures,
    result.error ?? 'Письмо не дошло за таймаут',
  )

  next.alertedAtFailures = next.consecutiveFailures
  next.lastAlertAt = new Date().toISOString()
  // Ключевое отличие от прежней версии: пишем ИСХОД отправки, а не факт вызова. Недоставленный
  // алерт заставит `shouldSendAlert` повторить попытку на следующем же прогоне.
  next.lastAlertDelivered = delivered

  return { state: next, alerted: delivered }
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
