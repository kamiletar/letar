/**
 * FFprobe модуль — получение информации о медиафайлах
 */

import { spawnFFprobe } from '../utils/ffmpeg-spawn'
import type { AudioTrack, MediaInfo, VideoTrack } from './types'
import { extractBitrate, getBitDepth } from './utils'

/** Информация о видео для расчёта прогресса */
export interface VideoInfo {
  duration: number
  fps: number
  /** Порядок полей: tt/bb = interlaced, progressive = прогрессивное */
  fieldOrder: string
}

/**
 * Получить длительность видеофайла в секундах
 */
export function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ff = spawnFFprobe([
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ])

    let output = ''
    ff.stdout.on('data', (data) => {
      output += data.toString()
    })

    ff.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim())
        resolve(isNaN(duration) ? 0 : duration)
      } else {
        reject(new Error(`ffprobe exited with code ${code}`))
      }
    })

    ff.on('error', reject)
  })
}

/**
 * Получить информацию о видео для расчёта прогресса кодирования
 * Возвращает duration и fps из probe (а не из stdout FFmpeg)
 */
export function getVideoInfo(filePath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const ff = spawnFFprobe([
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'format=duration:stream=r_frame_rate,field_order',
      '-of',
      'json',
      filePath,
    ])

    let data = ''
    ff.stdout.on('data', (chunk) => {
      data += chunk.toString()
    })

    ff.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe exited with code ${code}`))
      }

      try {
        const json = JSON.parse(data)
        const duration = json.format?.duration ? parseFloat(json.format.duration) : 0

        // Парсим FPS из первого видеопотока
        let fps = 23.976 // Fallback для NTSC аниме
        const stream = json.streams?.[0]
        if (stream?.r_frame_rate) {
          const [num, den] = stream.r_frame_rate.split('/')
          const parsedFps = parseInt(num, 10) / parseInt(den || '1', 10)
          if (parsedFps > 0 && parsedFps < 1000) {
            // Защита от некорректных значений
            fps = parsedFps
          }
        }

        const fieldOrder = stream?.field_order ?? 'progressive'

        resolve({ duration, fps, fieldOrder })
      } catch (error) {
        reject(error)
      }
    })

    ff.on('error', reject)
  })
}

/**
 * Получить информацию об аудиодорожках из видеофайла
 */
export function getAudioTracks(videoPath: string): Promise<AudioTrack[]> {
  return new Promise((resolve, reject) => {
    const ff = spawnFFprobe([
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=index,codec_name,bit_rate,channels:stream_tags',
      '-of',
      'json',
      videoPath,
    ])

    let data = ''
    ff.stdout.on('data', (chunk) => {
      data += chunk.toString()
    })

    ff.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error('ffprobe audio read error'))
      }

      try {
        const json = JSON.parse(data)
        const tracks: AudioTrack[] = (json.streams || []).map(
          (stream: {
            index: number
            codec_name?: string
            bit_rate?: string
            channels?: number
            tags?: Record<string, string | undefined>
          }) => ({
            input: videoPath,
            index: stream.index,
            language: stream.tags?.language || 'und',
            title: stream.tags?.title || 'Original',
            codec: stream.codec_name,
            bitrate: extractBitrate(stream),
            channels: stream.channels,
            tags: stream.tags, // Передаём все теги для парсинга на клиенте
          })
        )
        resolve(tracks)
      } catch (error) {
        reject(error)
      }
    })

    ff.on('error', reject)
  })
}

/**
 * Получить информацию о видеодорожках
 */
export function getVideoTracks(filePath: string): Promise<VideoTrack[]> {
  return new Promise((resolve, reject) => {
    const ff = spawnFFprobe([
      '-v',
      'error',
      '-select_streams',
      'v',
      '-show_entries',
      'stream=index,codec_name,width,height,bit_rate,r_frame_rate,pix_fmt,color_space,profile:format=duration',
      '-of',
      'json',
      filePath,
    ])

    let data = ''
    ff.stdout.on('data', (chunk) => {
      data += chunk.toString()
    })

    ff.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error('ffprobe video read error'))
      }

      try {
        const json = JSON.parse(data)
        const duration = json.format?.duration ? parseFloat(json.format.duration) : 0

        const tracks: VideoTrack[] = (json.streams || []).map(
          (stream: {
            codec_name?: string
            width?: number
            height?: number
            bit_rate?: string
            r_frame_rate?: string
            pix_fmt?: string
            color_space?: string
            profile?: string
          }) => {
            // Парсим частоту кадров (формат "30/1" или "24000/1001")
            let fps: number | undefined
            if (stream.r_frame_rate) {
              const [num, den] = stream.r_frame_rate.split('/')
              fps = parseInt(num, 10) / parseInt(den || '1', 10)
            }

            return {
              path: filePath,
              duration,
              width: stream.width,
              height: stream.height,
              codec: stream.codec_name,
              bitrate: stream.bit_rate ? parseInt(stream.bit_rate, 10) : undefined,
              fps,
              pixelFormat: stream.pix_fmt,
              bitDepth: getBitDepth(stream.pix_fmt),
              colorSpace: stream.color_space,
              profile: stream.profile,
            }
          }
        )
        resolve(tracks)
      } catch (error) {
        reject(error)
      }
    })

    ff.on('error', reject)
  })
}

/** Информация о субтитрах из MKV */
export interface SubtitleTrackInfo {
  /** Путь к исходному файлу */
  path: string
  /** Индекс потока */
  index: number
  /** Кодек/формат (ass, subrip, hdmv_pgs_subtitle и т.д.) */
  codec: string
  /** Код языка */
  language: string
  /** Название дорожки */
  title: string
  /** Шрифты (заполняется позже) */
  fonts: string[]
}

/**
 * Получить информацию о субтитрах
 */
export function getSubtitleTracks(filePath: string): Promise<SubtitleTrackInfo[]> {
  return new Promise((resolve, _reject) => {
    const ff = spawnFFprobe([
      '-v',
      'error',
      '-select_streams',
      's',
      '-show_entries',
      'stream=index,codec_name:stream_tags', // Запрашиваем ВСЕ теги, а не только language/title
      '-of',
      'json',
      filePath,
    ])

    let data = ''
    ff.stdout.on('data', (chunk) => {
      data += chunk.toString()
    })

    ff.on('close', (code) => {
      if (code !== 0) {
        // Нет субтитров — не ошибка
        return resolve([])
      }

      try {
        const json = JSON.parse(data)
        const tracks: SubtitleTrackInfo[] = (json.streams || []).map(
          (stream: { index: number; codec_name?: string; tags?: { language?: string; title?: string } }) => ({
            path: filePath,
            index: stream.index,
            codec: stream.codec_name || 'unknown',
            language: stream.tags?.language || 'und',
            title: stream.tags?.title || `Субтитры`,
            fonts: [],
            tags: stream.tags, // Передаём все теги для парсинга на клиенте
          })
        )
        resolve(tracks)
      } catch {
        resolve([])
      }
    })

    ff.on('error', () => resolve([]))
  })
}

/**
 * Извлечь главы и вложения из медиафайла через ffprobe
 */
async function getChaptersAndAttachments(
  filePath: string
): Promise<{ chapters: MediaInfo['chapters']; attachmentFonts: string[] }> {
  return new Promise((resolve) => {
    const ff = spawnFFprobe(['-v', 'error', '-show_chapters', '-show_streams', '-of', 'json', filePath])

    let stdout = ''
    ff.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    ff.on('close', () => {
      try {
        const data = JSON.parse(stdout)

        // Главы
        const chapters: MediaInfo['chapters'] =
          data.chapters?.map((ch: { start_time?: string; end_time?: string; tags?: { title?: string } }) => ({
            start: Number.parseFloat(ch.start_time || '0'),
            end: Number.parseFloat(ch.end_time || '0'),
            title: ch.tags?.title || 'Chapter',
          })) || []

        // Шрифты-вложения
        const FONT_EXTS = ['.ttf', '.otf', '.ttc', '.woff', '.woff2']
        const attachmentFonts: string[] = (data.streams || [])
          .filter(
            (s: { codec_type?: string; tags?: { filename?: string } }) =>
              s.codec_type === 'attachment' &&
              s.tags?.filename &&
              FONT_EXTS.some((ext) => (s.tags?.filename || '').toLowerCase().endsWith(ext))
          )
          .map((s: { tags: { filename: string } }) => s.tags.filename)

        resolve({ chapters: chapters.length > 0 ? chapters : undefined, attachmentFonts })
      } catch {
        resolve({ chapters: undefined, attachmentFonts: [] })
      }
    })

    ff.on('error', () => resolve({ chapters: undefined, attachmentFonts: [] }))
  })
}

/**
 * Получить полную информацию о медиафайле
 */
export async function probeFile(filePath: string): Promise<MediaInfo> {
  const [duration, videoTracks, audioTracks, subtitleTracks, chaptersAndFonts] = await Promise.all([
    getVideoDuration(filePath),
    getVideoTracks(filePath),
    getAudioTracks(filePath),
    getSubtitleTracks(filePath),
    getChaptersAndAttachments(filePath),
  ])

  // Получаем размер файла
  const fs = await import('fs')
  const stats = fs.statSync(filePath)

  // Определяем формат по расширению
  const path = await import('path')
  const format = path.extname(filePath).slice(1).toLowerCase()

  return {
    path: filePath,
    duration,
    size: stats.size,
    format,
    videoTracks,
    audioTracks,
    subtitleTracks,
    chapters: chaptersAndFonts.chapters,
    attachmentFonts: chaptersAndFonts.attachmentFonts,
  }
}
