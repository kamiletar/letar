/**
 * Подготовка чанков из Telegram экспорта СПб для AI-экстракции.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE = 'C:/Users/Kami/Downloads/Telegram Desktop/spb/result.json'
const CHUNKS_DIR = join(import.meta.dirname, 'chunks-spb')
const CHUNK_SIZE = 146_000

interface TgMessage {
  id: number
  type: string
  date: string
  text: string | Array<string | { type: string; text: string }>
  photo?: string
  [key: string]: unknown
}

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
  console.log('Чтение SPb Telegram экспорта...')
  const raw = readFileSync(SOURCE, 'utf-8')
  const data = JSON.parse(raw)

  console.log(`Всего сообщений: ${data.messages.length}`)

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

  for (let i = 0; i < chunks.length; i++) {
    const items = JSON.parse(chunks[i])
    const firstDate = items[0].date?.substring(0, 10)
    const lastDate = items[items.length - 1].date?.substring(0, 10)
    const filename = `chunk-${i + 1}.json`
    writeFileSync(join(CHUNKS_DIR, filename), chunks[i], 'utf-8')
    console.log(
      `  ${filename}: ${items.length} сообщений, ${
        (chunks[i].length / 1024).toFixed(0)
      } KB, ${firstDate} — ${lastDate}`,
    )
  }

  console.log(`\nГотово: ${chunks.length} чанков в ${CHUNKS_DIR}`)
}

main()
