import { createServer, type Server, type Socket } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'

import { ClamAvScanner } from './scanner-clamav'

/**
 * Тесты гоняют настоящий протокол clamd против поддельного сервера в этом же процессе.
 * Мокать сам сокет смысла нет: ошибиться можно ровно в разборе протокола (порядок байтов
 * длины чанка, терминатор, форма ответа), а мок это как раз и спрячет.
 */

type FakeClamdBehaviour = {
  /** Ответ на zINSTREAM без завершающего `\0` — его дописывает сам сервер */
  instreamReply?: string
  /** Ответ на zVERSION */
  versionReply?: string
  /** Оборвать соединение, не ответив — имитация упавшего clamd */
  hangUp?: boolean
  /** Не отвечать вовсе — имитация зависшего clamd (для таймаута) */
  silent?: boolean
}

let server: Server | undefined

/** Поднимает поддельный clamd на случайном свободном порту, возвращает его порт */
async function startFakeClamd(behaviour: FakeClamdBehaviour): Promise<number> {
  const received: Buffer[] = []
  server = createServer((socket: Socket) => {
    if (behaviour.hangUp) {
      socket.destroy()
      return
    }
    socket.on('data', (chunk) => {
      received.push(chunk)
      const asText = chunk.toString('latin1')
      if (behaviour.silent) {
        return
      }
      if (asText.startsWith('zVERSION')) {
        socket.write(`${behaviour.versionReply ?? 'ClamAV 1.4.1/27400/Wed Aug 27 09:00:00 2026'}\0`)
        socket.end()
        return
      }
      // Ответ на INSTREAM отдаём только после терминатора (четыре нулевых байта),
      // как это делает настоящий clamd
      const isTerminated = chunk.length >= 4 && chunk.readUInt32BE(chunk.length - 4) === 0
      if (isTerminated) {
        socket.write(`${behaviour.instreamReply ?? 'stream: OK'}\0`)
        socket.end()
      }
    })
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (typeof address === 'string' || address === null) {
    throw new Error('не удалось определить порт поддельного clamd')
  }
  return address.port
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = undefined
  }
})

describe('ClamAvScanner', () => {
  it('чистый файл — clamd отвечает "stream: OK"', async () => {
    const port = await startFakeClamd({ instreamReply: 'stream: OK' })
    const scanner = new ClamAvScanner({ host: '127.0.0.1', port })

    await expect(scanner.scan(Buffer.from('обычный файл'))).resolves.toEqual({ status: 'CLEAN' })
  })

  it('заражённый файл — сигнатура попадает в resultCode, а не теряется', async () => {
    const port = await startFakeClamd({ instreamReply: 'stream: Win.Test.EICAR_HDB-1 FOUND' })
    const scanner = new ClamAvScanner({ host: '127.0.0.1', port })

    await expect(scanner.scan(Buffer.from('вредонос'))).resolves.toEqual({
      status: 'INFECTED',
      resultCode: 'Win.Test.EICAR_HDB-1',
    })
  })

  it('ошибка clamd — SCAN_FAILED, никогда не CLEAN', async () => {
    const port = await startFakeClamd({ instreamReply: 'INSTREAM size limit exceeded. ERROR' })
    const scanner = new ClamAvScanner({ host: '127.0.0.1', port })

    const result = await scanner.scan(Buffer.from('слишком большой'))
    expect(result.status).toBe('SCAN_FAILED')
  })

  it('clamd недоступен — SCAN_FAILED, а не молчаливое CLEAN', async () => {
    // Порт, на котором заведомо никто не слушает
    const scanner = new ClamAvScanner({ host: '127.0.0.1', port: 1 })

    const result = await scanner.scan(Buffer.from('файл'))
    expect(result.status).toBe('SCAN_FAILED')
    expect(result).toHaveProperty('resultCode')
  })

  it('clamd оборвал соединение, не ответив — SCAN_FAILED', async () => {
    const port = await startFakeClamd({ hangUp: true })
    const scanner = new ClamAvScanner({ host: '127.0.0.1', port })

    const result = await scanner.scan(Buffer.from('файл'))
    expect(result.status).toBe('SCAN_FAILED')
  })

  it('clamd завис — срабатывает таймаут, не ждём вечно', async () => {
    const port = await startFakeClamd({ silent: true })
    const scanner = new ClamAvScanner({ host: '127.0.0.1', port, timeoutMs: 150 })

    const result = await scanner.scan(Buffer.from('файл'))
    expect(result).toEqual({ status: 'SCAN_FAILED', resultCode: 'TIMEOUT' })
  })

  it('файл больше лимита не отправляется в clamd вовсе — SIZE_LIMIT', async () => {
    const port = await startFakeClamd({ instreamReply: 'stream: OK' })
    const scanner = new ClamAvScanner({ host: '127.0.0.1', port, maxBytes: 10 })

    await expect(scanner.scan(Buffer.alloc(11))).resolves.toEqual({
      status: 'SCAN_FAILED',
      resultCode: 'SIZE_LIMIT',
    })
  })

  it('version — версия самого clamd с базами сигнатур, а не константа клиента', async () => {
    const port = await startFakeClamd({
      instreamReply: 'stream: OK',
      versionReply: 'ClamAV 1.4.1/27400/Wed Aug 27 09:00:00 2026',
    })
    const scanner = new ClamAvScanner({ host: '127.0.0.1', port })

    // До первого скана версия ещё не запрошена — обещать её нечем
    expect(scanner.version).toBe('unknown')

    await scanner.scan(Buffer.from('файл'))

    // Версия важна для audit-следа: по ней видно, какими базами файл был проверен
    expect(scanner.version).toBe('ClamAV 1.4.1/27400/Wed Aug 27 09:00:00 2026')
  })

  it('недоступный clamd не ломает version — остаётся unknown, скан всё равно падает', async () => {
    const scanner = new ClamAvScanner({ host: '127.0.0.1', port: 1 })

    await scanner.scan(Buffer.from('файл'))

    expect(scanner.version).toBe('unknown')
  })
})
