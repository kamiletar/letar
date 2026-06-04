/**
 * Canary-мониторинг доставки email (Этап 0.7 PLAN.md)
 *
 * Отправляет тестовое письмо через реальный SMTP (Maddy),
 * проверяет доставку через IMAP Яндекса.
 * При провале — алертит в Telegram.
 *
 * Env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD — Maddy (стандартные)
 *   SMTP_FROM_EMAIL                                — от кого (canary@letar.best)
 *   CANARY_TO                                      — куда (kaspergreen@yandex.ru)
 *   CANARY_IMAP_HOST                               — imap.yandex.ru
 *   CANARY_IMAP_USER                               — kaspergreen@yandex.ru
 *   CANARY_IMAP_PASSWORD                           — пароль приложения Яндекса
 *   CANARY_TIMEOUT_MS                              — таймаут ожидания (default: 60000)
 *   CANARY_POLL_INTERVAL_MS                        — интервал опроса (default: 5000)
 *   TELEGRAM_ALERT_BOT_TOKEN                       — бот для алертов
 *   TELEGRAM_ALERT_CHAT_ID                         — чат для алертов
 */

import { ImapFlow } from 'imapflow'
import { createTransport } from 'nodemailer'

const TIMEOUT_MS = Number(process.env.CANARY_TIMEOUT_MS ?? 60_000)
const POLL_INTERVAL_MS = Number(process.env.CANARY_POLL_INTERVAL_MS ?? 5_000)
const CANARY_TO = process.env.CANARY_TO ?? 'kaspergreen@yandex.ru'
const CANARY_FROM = process.env.SMTP_FROM_EMAIL ?? 'noreply@letar.best'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env: ${name}`)
  return val
}

/** Уникальный маркер в теме письма для поиска в IMAP */
function makeMarker(): string {
  return `canary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function sendCanary(marker: string): Promise<void> {
  const transport = createTransport({
    host: requireEnv('SMTP_HOST'),
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: requireEnv('SMTP_USER'),
      pass: requireEnv('SMTP_PASSWORD'),
    },
  })

  await transport.sendMail({
    from: CANARY_FROM,
    to: CANARY_TO,
    subject: `[letar-canary] ${marker}`,
    text: `Canary check at ${new Date().toISOString()}. Marker: ${marker}`,
  })
}

async function waitForDelivery(marker: string, deadline: number): Promise<number> {
  const client = new ImapFlow({
    host: requireEnv('CANARY_IMAP_HOST'),
    port: 993,
    secure: true,
    auth: {
      user: requireEnv('CANARY_IMAP_USER'),
      pass: requireEnv('CANARY_IMAP_PASSWORD'),
    },
    logger: false,
  })

  await client.connect()

  try {
    await client.mailboxOpen('INBOX')

    while (Date.now() < deadline) {
      // Ищем письмо с нашим маркером
      const messages = client.fetch(
        { since: new Date(Date.now() - 5 * 60 * 1000) },
        { envelope: true },
      )

      for await (const msg of messages) {
        if (msg.envelope.subject?.includes(marker)) {
          return Date.now()
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }

    throw new Error('Timeout: письмо не доставлено')
  } finally {
    await client.logout()
  }
}

async function sendTelegramAlert(text: string): Promise<void> {
  const token = process.env.TELEGRAM_ALERT_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID
  if (!token || !chatId) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

async function main() {
  const marker = makeMarker()
  const startedAt = Date.now()
  const deadline = startedAt + TIMEOUT_MS

  console.log(`[canary] start marker=${marker} from=${CANARY_FROM} to=${CANARY_TO}`)

  try {
    await sendCanary(marker)
    console.log(`[canary] sent in ${Date.now() - startedAt}ms`)

    const deliveredAt = await waitForDelivery(marker, deadline)
    const latencyMs = deliveredAt - startedAt

    console.log(`[canary] ✅ delivered latency=${latencyMs}ms`)
    process.exit(0)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[canary] ❌ FAIL: ${message}`)

    await sendTelegramAlert(
      `🚨 *letar email canary FAIL*\nFrom: \`${CANARY_FROM}\`\nTo: \`${CANARY_TO}\`\nError: ${message}`,
    )
    process.exit(1)
  }
}

main()
