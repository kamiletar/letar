/**
 * Subtitles route для Mobile Server
 *
 * Конвертирует SRT/ASS в VTT для браузера.
 * ASS субтитры упрощаются (без стилей) для нативного <track>.
 */

import { existsSync, readFileSync } from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import path from 'path'

import { getIpfsUrl } from '../../../utils/ipfs-url'
import { createModuleLogger } from '../../../utils/logger'
import { getDb } from '../../database'

const log = createModuleLogger('MobileSubtitles')

/**
 * Обработка запроса субтитров
 * GET /api/subtitles?path=C:/path/to/subs.ass
 */
export async function handleSubtitlesRequest(
  _req: IncomingMessage,
  res: ServerResponse,
  subtitlePath: string,
): Promise<void> {
  const decodedPath = decodeURIComponent(subtitlePath)

  // Проверяем whitelist — защита от произвольного чтения файлов
  const allowed = await isPathAllowed(decodedPath)
  if (!allowed) {
    log.error('Access denied (not in library)', { path: decodedPath })
    sendError(res, 403, 'Access denied')
    return
  }

  if (!existsSync(decodedPath)) {
    log.error('Subtitle file not found', { path: decodedPath })
    sendError(res, 404, 'Subtitle not found')
    return
  }

  try {
    const ext = path.extname(decodedPath).toLowerCase()
    const content = readFileSync(decodedPath, 'utf-8')

    let vttContent: string

    if (ext === '.vtt') {
      vttContent = content
    } else if (ext === '.srt') {
      vttContent = convertSrtToVtt(content)
    } else if (ext === '.ass' || ext === '.ssa') {
      vttContent = convertAssToVtt(content)
    } else {
      sendError(res, 400, 'Unsupported subtitle format')
      return
    }

    res.writeHead(200, {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    })
    res.end(vttContent)
  } catch (error) {
    log.error('Error processing subtitles', { error: String(error) })
    sendError(res, 500, 'Error processing subtitles')
  }
}

/**
 * Конвертация SRT в VTT
 */
function convertSrtToVtt(srt: string): string {
  // Заменяем запятые на точки в таймкодах
  let vtt = srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')

  // Добавляем заголовок WEBVTT
  if (!vtt.startsWith('WEBVTT')) {
    vtt = 'WEBVTT\n\n' + vtt
  }

  return vtt
}

/**
 * Конвертация ASS/SSA в VTT (упрощённая, без стилей)
 */
function convertAssToVtt(ass: string): string {
  const lines: string[] = ['WEBVTT', '']

  // Ищем секцию [Events]
  const eventsMatch = ass.match(/\[Events\]([\s\S]*?)(?:\[|$)/)
  if (!eventsMatch) {
    return lines.join('\n')
  }

  const eventsSection = eventsMatch[1]

  // Парсим формат
  const formatLine = eventsSection.match(/Format:\s*(.+)/)
  if (!formatLine) {
    return lines.join('\n')
  }

  const formatParts = formatLine[1].split(',').map((s) => s.trim().toLowerCase())
  const startIdx = formatParts.indexOf('start')
  const endIdx = formatParts.indexOf('end')
  const textIdx = formatParts.indexOf('text')

  if (startIdx === -1 || endIdx === -1 || textIdx === -1) {
    return lines.join('\n')
  }

  // Парсим диалоги
  const dialogueRegex = /Dialogue:\s*(.+)/g
  let match: RegExpExecArray | null
  let cueNumber = 1

  while ((match = dialogueRegex.exec(eventsSection)) !== null) {
    const parts = match[1].split(',')
    if (parts.length <= textIdx) {
      continue
    }

    const start = convertAssTimeToVtt(parts[startIdx])
    const end = convertAssTimeToVtt(parts[endIdx])

    // Текст может содержать запятые, поэтому собираем всё после textIdx
    const text = parts.slice(textIdx).join(',')
    const cleanText = stripAssFormatting(text)

    if (cleanText.trim()) {
      lines.push(`${cueNumber}`)
      lines.push(`${start} --> ${end}`)
      lines.push(cleanText)
      lines.push('')
      cueNumber++
    }
  }

  return lines.join('\n')
}

/**
 * Конвертация времени ASS (0:00:00.00) в VTT (00:00:00.000)
 */
function convertAssTimeToVtt(time: string): string {
  const trimmed = time.trim()
  const match = trimmed.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/)
  if (!match) {
    return '00:00:00.000'
  }

  const hours = match[1].padStart(2, '0')
  const minutes = match[2]
  const seconds = match[3]
  const centiseconds = match[4]

  // ASS использует сотые доли секунды, VTT — тысячные
  const milliseconds = centiseconds + '0'

  return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

/**
 * Удаление ASS форматирования из текста
 */
function stripAssFormatting(text: string): string {
  return (
    text
      // Удаляем override tags {...}
      .replace(/\{[^}]*\}/g, '')
      // Заменяем \N и \n на перенос строки
      .replace(/\\[Nn]/g, '\n')
      // Удаляем \h (hard space)
      .replace(/\\h/g, ' ')
      .trim()
  )
}

/**
 * Проверить, разрешён ли доступ к файлу
 */
async function isPathAllowed(filePath: string): Promise<boolean> {
  const db = getDb()

  const settings = await db.settings.findUnique({ where: { id: 'default' } })
  const libraryPath = settings?.libraryPath

  if (!libraryPath) {
    return false
  }

  const normalizedFilePath = path.normalize(filePath).toLowerCase()
  const normalizedLibraryPath = path.normalize(libraryPath).toLowerCase()

  return normalizedFilePath.startsWith(normalizedLibraryPath)
}

/**
 * Обработка запроса субтитров из IPFS
 * GET /api/subtitles/cid/:cid?format=ass
 *
 * Загружает субтитры из IPFS и конвертирует в VTT
 */
export async function handleIpfsSubtitlesRequest(
  _req: IncomingMessage,
  res: ServerResponse,
  cid: string,
  format: string,
): Promise<void> {
  const gatewayUrl = getIpfsUrl(cid)!

  try {
    const response = await fetch(gatewayUrl)

    if (!response.ok) {
      log.error('IPFS gateway error for subtitles', { cid, status: response.status })
      // Важно: закрываем body чтобы не утекало соединение
      await response.body?.cancel().catch(() => {
        /* игнорируем */
      })
      sendError(res, response.status, 'Failed to fetch subtitles from IPFS')
      return
    }

    const content = await response.text()
    let vttContent: string

    const lowerFormat = format.toLowerCase()
    if (lowerFormat === 'vtt') {
      vttContent = content
    } else if (lowerFormat === 'srt') {
      vttContent = convertSrtToVtt(content)
    } else if (lowerFormat === 'ass' || lowerFormat === 'ssa') {
      vttContent = convertAssToVtt(content)
    } else {
      sendError(res, 400, 'Unsupported subtitle format')
      return
    }

    res.writeHead(200, {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000', // Кэш на год (CID immutable)
    })
    res.end(vttContent)
  } catch (error) {
    const errorStr = String(error)

    // Игнорируем ошибки когда клиент закрыл соединение
    if (errorStr.includes('terminated') || errorStr.includes('aborted')) {
      log.debug('Client closed connection', { cid: cid.substring(0, 12) })
      return
    }

    log.error('IPFS subtitle proxy error', { cid, error: errorStr })

    if (error instanceof TypeError && errorStr.includes('fetch failed')) {
      sendError(res, 503, 'IPFS gateway not running')
      return
    }

    sendError(res, 500, 'Failed to process IPFS subtitles')
  }
}

/** Отправить ошибку */
function sendError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: message }))
}
