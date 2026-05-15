/**
 * FFprobe модуль — получение информации о медиафайлах
 */

import { spawnFFprobe } from '../../utils/ffmpeg-spawn'
import type { AudioTrack, MediaInfo, VideoTrack } from './types'

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
      'stream=index,codec_name,bit_rate,channels:stream_tags=language,title',
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
            tags?: { language?: string; title?: string }
          }) => ({
            input: videoPath,
            index: stream.index,
            language: stream.tags?.language || 'und',
            title: stream.tags?.title || 'Original',
            codec: stream.codec_name,
            bitrate: stream.bit_rate ? parseInt(stream.bit_rate, 10) : undefined,
            channels: stream.channels,
          }),
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
      'stream=index,codec_name,width,height,bit_rate,r_frame_rate,field_order:format=duration',
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
            field_order?: string
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
              fieldOrder: stream.field_order,
            }
          },
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
 * Получить полную информацию о медиафайле
 */
export async function probeFile(filePath: string): Promise<MediaInfo> {
  const [duration, videoTracks, audioTracks] = await Promise.all([
    getVideoDuration(filePath),
    getVideoTracks(filePath),
    getAudioTracks(filePath),
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
    subtitleTracks: [], // Субтитры обычно в отдельных файлах
  }
}
