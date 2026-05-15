/**
 * Сдвиг таймкодов субтитров ASS/SRT
 *
 * Используется для синхронизации донорских субтитров с оригинальным видео.
 * Положительное смещение = донор опережает (сдвиг вперёд)
 * Отрицательное смещение = донор отстаёт (сдвиг назад)
 */

import * as fs from 'fs/promises'
import * as path from 'path'

export interface ShiftSubtitlesOptions {
  /** Путь к исходному файлу субтитров */
  inputPath: string
  /** Путь для сохранения результата */
  outputPath: string
  /** Смещение в миллисекундах (+ вперёд, - назад) */
  offsetMs: number
}

export interface ShiftSubtitlesResult {
  success: boolean
  /** Количество удалённых событий с отрицательным временем */
  removedEvents?: number
  /** Общее количество обработанных событий */
  totalEvents?: number
  error?: string
}

// === ASS таймкоды ===

/**
 * Парсинг ASS таймкода в миллисекунды
 * Формат: H:MM:SS.CC (часы:минуты:секунды.сотые)
 */
function parseAssTime(time: string): number {
  const match = time.match(/^(\d+):(\d{2}):(\d{2})\.(\d{2})$/)
  if (!match) {
    return 0
  }
  const [, h, m, s, cs] = match
  return (
    parseInt(h, 10) * 3600000 + // часы -> мс
    parseInt(m, 10) * 60000 + // минуты -> мс
    parseInt(s, 10) * 1000 + // секунды -> мс
    parseInt(cs, 10) * 10 // сотые -> мс
  )
}

/**
 * Форматирование миллисекунд в ASS таймкод
 */
function formatAssTime(ms: number): string {
  if (ms < 0) {
    ms = 0
  }

  const totalSeconds = Math.floor(ms / 1000)
  const centiseconds = Math.floor((ms % 1000) / 10)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)

  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds
    .toString()
    .padStart(2, '0')}`
}

/**
 * Сдвиг таймкодов в ASS файле
 */
function shiftAssContent(content: string, offsetMs: number): { content: string; removed: number; total: number } {
  const lines = content.split(/\r?\n/)
  const result: string[] = []
  let removed = 0
  let total = 0

  for (const line of lines) {
    // Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
    // Пример: Dialogue: 0,0:00:10.00,0:00:15.00,Default,,0,0,0,,Текст
    const dialogueMatch = line.match(/^(Dialogue:\s*)(\d+),([^,]+),([^,]+),(.*)$/)

    if (dialogueMatch) {
      total++
      const [, prefix, layer, startTime, endTime, rest] = dialogueMatch

      const startMs = parseAssTime(startTime) + offsetMs
      const endMs = parseAssTime(endTime) + offsetMs

      // Если событие полностью ушло в отрицательное время — удаляем
      if (endMs <= 0) {
        removed++
        continue
      }

      // Форматируем новые таймкоды
      const newStart = formatAssTime(startMs)
      const newEnd = formatAssTime(endMs)

      result.push(`${prefix}${layer},${newStart},${newEnd},${rest}`)
    } else {
      // Не Dialogue строка — оставляем как есть
      result.push(line)
    }
  }

  return {
    content: result.join('\n'),
    removed,
    total,
  }
}

// === SRT таймкоды ===

/**
 * Парсинг SRT таймкода в миллисекунды
 * Формат: HH:MM:SS,mmm
 */
function parseSrtTime(time: string): number {
  const match = time.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/)
  if (!match) {
    return 0
  }
  const [, h, m, s, ms] = match
  return parseInt(h, 10) * 3600000 + parseInt(m, 10) * 60000 + parseInt(s, 10) * 1000 + parseInt(ms, 10)
}

/**
 * Форматирование миллисекунд в SRT таймкод
 */
function formatSrtTime(ms: number): string {
  if (ms < 0) {
    ms = 0
  }

  const totalSeconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

/**
 * Сдвиг таймкодов в SRT файле
 */
function shiftSrtContent(content: string, offsetMs: number): { content: string; removed: number; total: number } {
  // SRT формат:
  // 1
  // 00:00:10,000 --> 00:00:15,000
  // Текст субтитра
  //
  // 2
  // ...

  const blocks = content.split(/\r?\n\r?\n/)
  const result: string[] = []
  let removed = 0
  let total = 0
  let newIndex = 1

  for (const block of blocks) {
    const lines = block.split(/\r?\n/)
    if (lines.length < 2) {
      // Пустой или неполный блок — пропускаем
      continue
    }

    // Ищем строку с таймкодами
    const timeLineIndex = lines.findIndex((line) => line.includes(' --> '))
    if (timeLineIndex === -1) {
      // Нет таймкодов — оставляем как есть (может быть комментарий)
      result.push(block)
      continue
    }

    total++

    const timeLine = lines[timeLineIndex]
    const timeMatch = timeLine.match(/^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})(.*)$/)

    if (!timeMatch) {
      // Неверный формат таймкода — оставляем как есть
      result.push(block)
      continue
    }

    const [, startTime, endTime, rest] = timeMatch

    const startMs = parseSrtTime(startTime) + offsetMs
    const endMs = parseSrtTime(endTime) + offsetMs

    // Если событие полностью ушло в отрицательное время — удаляем
    if (endMs <= 0) {
      removed++
      continue
    }

    // Формируем новый блок
    const newTimeLine = `${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}${rest}`
    const newLines = [...lines]
    newLines[0] = newIndex.toString() // Перенумеровываем
    newLines[timeLineIndex] = newTimeLine

    result.push(newLines.join('\n'))
    newIndex++
  }

  return {
    content: result.join('\n\n'),
    removed,
    total,
  }
}

// === Главная функция ===

/**
 * Сдвинуть таймкоды в файле субтитров
 *
 * @param options Параметры сдвига
 * @returns Результат операции
 */
export async function shiftSubtitles(options: ShiftSubtitlesOptions): Promise<ShiftSubtitlesResult> {
  const { inputPath, outputPath, offsetMs } = options

  // Если смещение нулевое — просто копируем файл
  if (offsetMs === 0) {
    try {
      await fs.copyFile(inputPath, outputPath)
      return { success: true, removedEvents: 0, totalEvents: 0 }
    } catch (err) {
      return { success: false, error: `Ошибка копирования: ${err}` }
    }
  }

  try {
    // Определяем формат по расширению
    const ext = path.extname(inputPath).toLowerCase()
    const content = await fs.readFile(inputPath, 'utf8')

    let result: { content: string; removed: number; total: number }

    if (ext === '.ass' || ext === '.ssa') {
      result = shiftAssContent(content, offsetMs)
    } else if (ext === '.srt') {
      result = shiftSrtContent(content, offsetMs)
    } else if (ext === '.vtt') {
      // VTT похож на SRT, но с другим форматом таймкодов
      // Пока не поддерживаем — копируем как есть
      await fs.copyFile(inputPath, outputPath)
      return {
        success: true,
        removedEvents: 0,
        totalEvents: 0,
        error: 'VTT формат пока не поддерживает сдвиг таймкодов',
      }
    } else {
      return { success: false, error: `Неподдерживаемый формат: ${ext}` }
    }

    // Создаём директорию если не существует
    await fs.mkdir(path.dirname(outputPath), { recursive: true })

    // Сохраняем результат
    await fs.writeFile(outputPath, result.content, 'utf8')

    return {
      success: true,
      removedEvents: result.removed,
      totalEvents: result.total,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Предпросмотр сдвига — возвращает первые N событий с новыми таймкодами
 * Полезно для UI калибровки
 */
export async function previewShift(
  inputPath: string,
  offsetMs: number,
  limit = 5
): Promise<{ events: Array<{ start: string; end: string; text: string }>; total: number }> {
  const content = await fs.readFile(inputPath, 'utf8')
  const ext = path.extname(inputPath).toLowerCase()

  const events: Array<{ start: string; end: string; text: string }> = []
  let total = 0

  if (ext === '.ass' || ext === '.ssa') {
    const lines = content.split(/\r?\n/)
    for (const line of lines) {
      if (events.length >= limit) {
        break
      }

      const match = line.match(/^Dialogue:\s*\d+,([^,]+),([^,]+),[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,(.*)$/)
      if (match) {
        total++
        const [, startTime, endTime, text] = match
        const startMs = parseAssTime(startTime) + offsetMs
        const endMs = parseAssTime(endTime) + offsetMs

        if (endMs > 0) {
          events.push({
            start: formatAssTime(startMs),
            end: formatAssTime(endMs),
            text: text.replace(/\\N/g, ' ').substring(0, 50),
          })
        }
      }
    }
  } else if (ext === '.srt') {
    const blocks = content.split(/\r?\n\r?\n/)
    for (const block of blocks) {
      if (events.length >= limit) {
        break
      }

      const lines = block.split(/\r?\n/)
      const timeLineIndex = lines.findIndex((line) => line.includes(' --> '))
      if (timeLineIndex === -1) {
        continue
      }

      total++
      const timeMatch = lines[timeLineIndex].match(/^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)
      if (!timeMatch) {
        continue
      }

      const [, startTime, endTime] = timeMatch
      const startMs = parseSrtTime(startTime) + offsetMs
      const endMs = parseSrtTime(endTime) + offsetMs

      if (endMs > 0) {
        const text = lines
          .slice(timeLineIndex + 1)
          .join(' ')
          .substring(0, 50)
        events.push({
          start: formatSrtTime(startMs),
          end: formatSrtTime(endMs),
          text,
        })
      }
    }
  }

  return { events, total }
}
