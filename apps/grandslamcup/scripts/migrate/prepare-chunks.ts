/**
 * Подготовка чанков из Telegram экспорта для AI-экстракции.
 * Очищает JSON от медиа-данных, оставляя только id + date + text.
 * Разбивает на чанки ~146KB для Haiku.
 *
 * Запуск: bun run scripts/migrate/prepare-chunks.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE = 'C:/Users/Kami/Downloads/Telegram Desktop/slam/result.json'
const CHUNKS_DIR = join(import.meta.dirname, 'chunks')
const CHUNK_SIZE = 146_000

interface TgMessage {
  id: number
  type: string
  date: string
  text: string | Array<string | { type: string; text: string }>
  photo?: string
  media_type?: string
  [key: string]: unknown
}

/** Извлечь плоский текст из сообщения */
function getText(msg: TgMessage): string {
  if (!msg.text) {
    return ''
  }
  if (typeof msg.text === 'string') {
    return msg.text
  }
  return msg.text.map((part) => (typeof part === 'string' ? part : part.text || '')).join('')
}

function main() {
  console.log('Чтение Telegram экспорта...')
  const raw = readFileSync(SOURCE, 'utf-8')
  const data = JSON.parse(raw)

  console.log(`Всего сообщений: ${data.messages.length}`)

  // Очистка: только id, date, text (непустой)
  const cleaned = data.messages
    .filter((m: TgMessage) => m.type === 'message')
    .map((m: TgMessage) => ({
      id: m.id,
      date: m.date,
      text: getText(m).trim(),
      hasPhoto: !!m.photo,
    }))
    .filter((m: { text: string }) => m.text.length > 5)

  console.log(`После очистки: ${cleaned.length} сообщений`)

  // Разбиение на чанки
  mkdirSync(CHUNKS_DIR, { recursive: true })

  const chunks: string[] = []
  let current = '[\n'

  for (const item of cleaned) {
    const itemStr = JSON.stringify(item)
    if (current.length + itemStr.length > CHUNK_SIZE && current.length > 2) {
      chunks.push(current + '\n]')
      current = '[\n'
    }
    current += (current.length > 2 ? ',\n' : '') + itemStr
  }
  if (current.length > 2) {
    chunks.push(current + '\n]')
  }

  // Сохранение чанков
  for (let i = 0; i < chunks.length; i++) {
    const items = JSON.parse(chunks[i])
    const firstDate = items[0].date?.substring(0, 10)
    const lastDate = items[items.length - 1].date?.substring(0, 10)
    const filename = `chunk-${i + 1}.json`
    writeFileSync(join(CHUNKS_DIR, filename), chunks[i], 'utf-8')
    console.log(
      `  ${filename}: ${items.length} сообщений, ${(chunks[i].length / 1024).toFixed(0)} KB, ${firstDate} — ${lastDate}`
    )
  }

  console.log(`\nГотово: ${chunks.length} чанков в ${CHUNKS_DIR}`)
}

main()
