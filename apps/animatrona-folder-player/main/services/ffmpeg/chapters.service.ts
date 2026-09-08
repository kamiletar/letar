/**
 * Главы (OP/ED) через ffprobe — дополняет `mediaInfoWasmProber`, который сознательно не отдаёт
 * главы (см. `main/services/media-info-prober.ts`: формат динамических timecode-ключей Menu-трека
 * MediaInfoLib не проверен без реальных фикстур). `ffprobe -show_chapters` — документированный
 * стабильный JSON-формат, не требует проверки на реальном файле, чтобы доверять схеме.
 *
 * Работает, только если ffmpeg доступен (Фаза 6, `ffmpeg-installer.service`) — иначе `undefined`,
 * без ошибки: файл без глав играется как раньше, просто без кнопки «Пропустить опенинг».
 */
import type { MediaChapter } from '@letar/folder-scan'
import { spawn } from 'node:child_process'

import { getFfmpegStatus } from './ffmpeg-installer.service'

interface FfprobeChapter {
  start_time?: string
  end_time?: string
  tags?: { title?: string }
}

interface FfprobeChaptersOutput {
  chapters?: FfprobeChapter[]
}

function parseTimeSeconds(value: string | undefined): number | null {
  if (value === undefined) {
    return null
  }
  const seconds = Number.parseFloat(value)
  return Number.isFinite(seconds) ? seconds : null
}

/** Главы файла через ffprobe, либо `undefined` — если ffmpeg недоступен или глав нет */
export async function probeChaptersWithFfprobe(filePath: string): Promise<MediaChapter[] | undefined> {
  const status = await getFfmpegStatus()
  if (!status.available || !status.ffprobePath) {
    return undefined
  }

  const stdout = await new Promise<string>((resolve, reject) => {
    const args = ['-v', 'error', '-print_format', 'json', '-show_chapters', filePath]
    const child = spawn(status.ffprobePath as string, args, { windowsHide: true })
    let output = ''
    let stderrTail = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-500)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe завершился с кодом ${code}: ${stderrTail.trim()}`))
        return
      }
      resolve(output)
    })
  }).catch(() => null)

  if (stdout === null) {
    return undefined
  }

  let parsed: FfprobeChaptersOutput
  try {
    parsed = JSON.parse(stdout) as FfprobeChaptersOutput
  } catch {
    return undefined
  }

  const chapters = (parsed.chapters ?? [])
    .map((chapter): MediaChapter | null => {
      const start = parseTimeSeconds(chapter.start_time)
      const end = parseTimeSeconds(chapter.end_time)
      if (start === null || end === null) {
        return null
      }
      return { start, end, title: chapter.tags?.title ?? '' }
    })
    .filter((chapter): chapter is MediaChapter => chapter !== null)

  return chapters.length > 0 ? chapters : undefined
}
