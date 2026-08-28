import { connect, type Socket } from 'node:net'

import type { FileScanner, ScanResult } from './types'

/**
 * Сканер поверх clamd (контейнер `letar-clamav`, см. `infra/clamav/README.md` в корне letar).
 *
 * ⚠️ Главное правило этого файла: **любая неудача — это `SCAN_FAILED`, никогда не `CLEAN`.**
 * Недоступный, зависший или ответивший ошибкой clamd означает «мы не знаем, что в файле», а не
 * «файл чистый». Единственный по-настоящему опасный способ сломать контур приватных файлов —
 * трактовать отказ сканера как успех, поэтому на каждый путь отказа есть тест.
 */

/** Размер чанка при отправке в clamd. Больше 64 КБ смысла нет — clamd читает по чанкам */
const CHUNK_BYTES = 64 * 1024

/**
 * По умолчанию — 25 МБ, ровно `StreamMaxLength` из стоковой конфигурации clamd. Файл больше
 * лимита clamd не сканирует, а отвечает ошибкой, поэтому режем на своей стороне: так в audit
 * попадает внятный `SIZE_LIMIT`, а не разбор чужого текста ошибки.
 */
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_PORT = 3310

export interface ClamAvScannerOptions {
  host: string
  port?: number
  timeoutMs?: number
  maxBytes?: number
}

export class ClamAvScanner implements FileScanner {
  readonly name = 'clamav'

  private readonly host: string
  private readonly port: number
  private readonly timeoutMs: number
  private readonly maxBytes: number
  /**
   * Версия clamd вместе с версией баз сигнатур — по ней в audit видно, чем именно проверен
   * файл. Запрашивается лениво при первом скане: вызывающий код читает `version` уже после
   * `scan()`, поэтому отдельного шага инициализации не нужно.
   */
  private cachedVersion = 'unknown'

  constructor(options: ClamAvScannerOptions) {
    this.host = options.host
    this.port = options.port ?? DEFAULT_PORT
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  }

  get version(): string {
    return this.cachedVersion
  }

  async scan(bytes: Buffer): Promise<ScanResult> {
    if (bytes.length > this.maxBytes) {
      return { status: 'SCAN_FAILED', resultCode: 'SIZE_LIMIT' }
    }

    let reply: string
    try {
      reply = await this.sendInstream(bytes)
    } catch (error) {
      return { status: 'SCAN_FAILED', resultCode: describeFailure(error) }
    }

    const result = parseInstreamReply(reply)

    // Версию спрашиваем только при удавшемся скане: если clamd не отвечает, второй заход
    // к нему ничего не добавит, а времени отнимет столько же
    if (result.status !== 'SCAN_FAILED' && this.cachedVersion === 'unknown') {
      this.cachedVersion = await this.probeVersion()
    }

    return result
  }

  /** Версия clamd отдельным соединением — clamd принимает одну команду на соединение */
  private async probeVersion(): Promise<string> {
    try {
      const reply = await this.request((socket) => socket.write('zVERSION\0'))
      return reply.trim() || 'unknown'
    } catch {
      // Версия — это audit-удобство, а не условие корректности: не смогли узнать, оставляем
      // 'unknown' и не роняем уже состоявшийся скан
      return 'unknown'
    }
  }

  private async sendInstream(bytes: Buffer): Promise<string> {
    return this.request((socket) => {
      socket.write('zINSTREAM\0')
      for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
        const chunk = bytes.subarray(offset, offset + CHUNK_BYTES)
        const header = Buffer.alloc(4)
        header.writeUInt32BE(chunk.length)
        socket.write(header)
        socket.write(chunk)
      }
      // Нулевая длина — терминатор потока, после него clamd отвечает
      socket.write(Buffer.alloc(4))
    })
  }

  /**
   * Одно соединение = одна команда. Ответ clamd в `z`-режиме завершается нулевым байтом,
   * поэтому читаем до него, а не до закрытия сокета: зависший clamd закрытия не пришлёт.
   */
  private request(sendCommand: (socket: Socket) => void): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const socket = connect({ host: this.host, port: this.port })
      const chunks: Buffer[] = []
      let settled = false

      const finish = (outcome: () => void): void => {
        if (settled) {
          return
        }
        settled = true
        socket.destroy()
        outcome()
      }

      socket.setTimeout(this.timeoutMs)
      socket.on('timeout', () => finish(() => reject(new ClamAvTimeoutError())))
      socket.on('error', (error) => finish(() => reject(error)))

      socket.on('connect', () => {
        try {
          sendCommand(socket)
        } catch (error) {
          finish(() => reject(error))
        }
      })

      socket.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        const buffered = Buffer.concat(chunks)
        const terminator = buffered.indexOf(0)
        if (terminator !== -1) {
          finish(() => resolve(buffered.subarray(0, terminator).toString('latin1')))
        }
      })

      // Обрыв без ответа — не «пусто, значит чисто», а отказ
      socket.on('close', () => finish(() => reject(new ClamAvClosedError())))
    })
  }
}

class ClamAvTimeoutError extends Error {
  readonly code = 'TIMEOUT'
}

class ClamAvClosedError extends Error {
  readonly code = 'CONNECTION_CLOSED'
}

function describeFailure(error: unknown): string {
  if (error instanceof ClamAvTimeoutError || error instanceof ClamAvClosedError) {
    return error.code
  }
  if (error !== null && typeof error === 'object' && 'code' in error) {
    // Сетевые ошибки Node приходят с кодом вида ECONNREFUSED/EHOSTUNREACH
    return String((error as { code: unknown }).code)
  }
  return 'UNKNOWN_ERROR'
}

/**
 * Разбор ответа clamd. Формы ровно три:
 *   `stream: OK`
 *   `stream: <Имя.Сигнатуры> FOUND`
 *   `<текст>ERROR`
 */
function parseInstreamReply(reply: string): ScanResult {
  const trimmed = reply.trim()

  if (trimmed.endsWith('ERROR')) {
    return { status: 'SCAN_FAILED', resultCode: trimmed }
  }
  if (trimmed.endsWith('FOUND')) {
    const signature = trimmed
      .replace(/^stream:\s*/, '')
      .replace(/\s*FOUND$/, '')
      .trim()
    return { status: 'INFECTED', resultCode: signature || 'UNKNOWN_SIGNATURE' }
  }
  if (trimmed.endsWith('OK')) {
    return { status: 'CLEAN' }
  }

  // Неизвестная форма ответа — тоже отказ. Трактовать «что-то непонятное» как чистый файл
  // ровно тот способ сломать контур, от которого защищает весь этот модуль
  return { status: 'SCAN_FAILED', resultCode: 'UNPARSEABLE_REPLY' }
}
