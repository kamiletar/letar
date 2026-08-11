/**
 * IPC handlers для просмотра main.log из renderer.
 *
 * Поддерживает:
 * - logs:tail — получить последние N строк (один раз)
 * - logs:startWatch — подписка на новые строки лога (live tail)
 * - logs:stopWatch — отписка
 *
 * События в renderer:
 * - logs:newLines — массив новых строк лога
 */

import * as fs from 'fs'

import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'
import { getLogFilePath } from '../utils/logger'

/** Watcher state */
let watcher: fs.FSWatcher | null = null
let lastReadSize = 0
let watchTimer: NodeJS.Timeout | null = null

/** Прочитать последние N строк файла (простой подход — читаем весь файл, берём конец) */
function tailFile(filePath: string, lines: number): string {
  try {
    const stat = fs.statSync(filePath)
    // Если файл маленький — читаем весь
    if (stat.size < 256 * 1024) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const allLines = content.split('\n')
      return allLines.slice(-lines).join('\n')
    }
    // Большой файл — читаем последние 256KB и берём строки оттуда
    const fd = fs.openSync(filePath, 'r')
    try {
      const bufSize = 256 * 1024
      const start = Math.max(0, stat.size - bufSize)
      const buf = Buffer.alloc(bufSize)
      const bytesRead = fs.readSync(fd, buf, 0, bufSize, start)
      const content = buf.toString('utf-8', 0, bytesRead)
      const allLines = content.split('\n')
      // Первая строка может быть обрезанной — выкидываем её
      return allLines.slice(1).slice(-lines).join('\n')
    } finally {
      fs.closeSync(fd)
    }
  } catch (err) {
    return `[Не удалось прочитать лог: ${err instanceof Error ? err.message : String(err)}]`
  }
}

/** Прочитать новые строки с offset до текущего конца файла */
function readNewLines(filePath: string, offset: number): { lines: string[]; newSize: number } {
  const stat = fs.statSync(filePath)
  if (stat.size <= offset) {
    return { lines: [], newSize: stat.size }
  }
  const fd = fs.openSync(filePath, 'r')
  try {
    const bufSize = stat.size - offset
    const buf = Buffer.alloc(bufSize)
    const bytesRead = fs.readSync(fd, buf, 0, bufSize, offset)
    const content = buf.toString('utf-8', 0, bytesRead)
    const lines = content.split('\n').filter((l) => l.length > 0)
    return { lines, newSize: stat.size }
  } finally {
    fs.closeSync(fd)
  }
}

export function registerLogsHandlers(): void {
  /** Получить tail последних N строк */
  createHandler('logs:tail', (linesCount = 200): { content: string; filePath: string | null } => {
    const filePath = getLogFilePath()
    if (!filePath || !fs.existsSync(filePath)) {
      return { content: '[Лог-файл ещё не создан]', filePath }
    }
    const content = tailFile(filePath, Math.min(2000, Math.max(1, linesCount)))
    return { content, filePath }
  })

  /** Старт live-watch — подписка на новые строки */
  createHandler('logs:startWatch', () => {
    const filePath = getLogFilePath()
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Лог-файл не существует' }
    }

    if (watcher) {
      // Уже подписаны
      return { success: true }
    }

    // Запоминаем текущий размер — будем читать ТОЛЬКО новые добавления
    try {
      lastReadSize = fs.statSync(filePath).size
    } catch {
      lastReadSize = 0
    }

    // Используем polling вместо fs.watch — надёжнее на Windows для append-only логов
    watchTimer = setInterval(() => {
      try {
        const { lines, newSize } = readNewLines(filePath, lastReadSize)
        if (lines.length > 0) {
          lastReadSize = newSize
          broadcastToWindows('logs:newLines', lines)
        } else {
          // Файл мог быть ротирован — размер уменьшился
          const stat = fs.statSync(filePath)
          if (stat.size < lastReadSize) {
            lastReadSize = 0
            broadcastToWindows('logs:newLines', ['--- лог ротирован ---'])
          }
        }
      } catch {
        /* ignore — следующая итерация попробует снова */
      }
    }, 500)

    // Создаём заглушечный watcher для совместимости (хотя реально используем polling)
    // close — заглушка для совместимости типа, реально используется polling (watchTimer)
    watcher = {
      close: () => {
        // намеренно пусто — polling останавливает watchTimer, а не этот close
      },
    } as unknown as fs.FSWatcher

    return { success: true }
  })

  /** Стоп live-watch */
  createHandler('logs:stopWatch', () => {
    if (watchTimer) {
      clearInterval(watchTimer)
      watchTimer = null
    }
    if (watcher) {
      watcher.close()
      watcher = null
    }
    return { success: true }
  })
}
