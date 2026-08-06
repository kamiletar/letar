/**
 * Anime4K — апскейл аниме через libplacebo (GPU шейдеры)
 *
 * Использует шейдер Anime4K_Upscale_Denoise_CNN_x2_VL.glsl
 * с FFmpeg фильтром libplacebo (Vulkan).
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import { spawnFFprobe } from '../utils/ffmpeg-spawn'

const SHADER_FILENAME = 'Anime4K_Upscale_Denoise_CNN_x2_VL.glsl'

/** Display информация из ffprobe */
interface DisplayInfo {
  /** Ширина видеопотока в пикселях */
  width: number
  /** Высота видеопотока в пикселях */
  height: number
  /** Числитель SAR (sample aspect ratio) */
  sarNum: number
  /** Знаменатель SAR */
  sarDen: number
  /** Display width = width * sarNum / sarDen */
  displayWidth: number
  /** Порядок полей: tt/bb = interlaced, progressive = прогрессивное */
  fieldOrder: string
}

/**
 * Получить путь к шейдеру Anime4K из resources
 */
export function getAnime4KShaderPath(): string {
  const isDev = !app.isPackaged

  if (!isDev) {
    const resourcesPath = process.resourcesPath || path.join(app.getAppPath(), '..')
    return path.join(resourcesPath, 'anime4k', SHADER_FILENAME)
  }

  // Dev: ищем в resources рядом с приложением
  const possibleRoots = [app.getAppPath(), path.join(app.getAppPath(), '..'), path.resolve(__dirname, '..', '..', '..')]

  for (const root of possibleRoots) {
    const candidate = path.join(root, 'resources', 'anime4k', SHADER_FILENAME)
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  // Fallback
  return path.resolve(__dirname, '..', '..', 'resources', 'anime4k', SHADER_FILENAME)
}

/**
 * Проверить доступность Anime4K (шейдер существует)
 */
export function isAnime4KAvailable(): boolean {
  return fs.existsSync(getAnime4KShaderPath())
}

/**
 * Получить display информацию видеопотока через ffprobe
 */
async function probeDisplayInfo(inputPath: string): Promise<DisplayInfo> {
  return new Promise((resolve, reject) => {
    const ff = spawnFFprobe([
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,sample_aspect_ratio,field_order',
      '-of',
      'csv=p=0',
      inputPath,
    ])

    let output = ''
    ff.stdout.on('data', (d: Buffer) => {
      output += d.toString()
    })

    ff.on('close', (code: number) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe display info failed, code ${code}`))
      }

      // Формат: "704,480,8:9,tt" или "1920,1080,1:1,progressive"
      const parts = output.trim().split(',')
      const width = parseInt(parts[0], 10) || 1920
      const height = parseInt(parts[1], 10) || 1080
      const sarStr = parts[2] || '1:1'
      const fieldOrder = parts[3]?.trim() || 'progressive'
      const sarParts = sarStr.split(':')
      const sarNum = parseInt(sarParts[0], 10)
      const sarDen = parseInt(sarParts[1], 10)

      // SAR 0:1 или N/A означает квадратные пиксели
      const effectiveSarNum = sarNum > 0 && sarDen > 0 ? sarNum : 1
      const effectiveSarDen = sarNum > 0 && sarDen > 0 ? sarDen : 1

      const displayWidth = Math.round((width * effectiveSarNum) / effectiveSarDen)

      resolve({ width, height, sarNum: effectiveSarNum, sarDen: effectiveSarDen, displayWidth, fieldOrder })
    })

    ff.on('error', reject)
  })
}

/**
 * Построить FFmpeg -vf фильтр для Anime4K апскейла
 *
 * Автоматически:
 * - Определяет SAR, display dimensions и field_order
 * - Если источник interlaced (field_order=tt/bb) — добавляет yadif bob деинтерлейс
 * - Нормализует пиксели (setsar=1, scale до display size)
 * - Применяет шейдер через libplacebo
 * - Выбирает цель: 1440×1080 (4:3) или 1920×1080 (16:9+)
 */
export async function buildAnime4KFilter(
  inputPath: string,
  shaderPath: string,
  denoiseEnabled = false,
): Promise<string> {
  const info = await probeDisplayInfo(inputPath)

  const { displayWidth, height, fieldOrder } = info

  // Целевое разрешение по display AR
  const displayAR = displayWidth / height
  const targetW = displayAR > 1.5 ? 1920 : 1440
  const targetH = 1080

  // Экранирование пути для FFmpeg filter string:
  // Windows-путь C:\path → C\:/path (двоеточие экранируется)
  const shaderEsc = shaderPath.replace(/\\/g, '/').replace(':', '\\:')

  const parts: string[] = []

  // Авто-деинтерлейс: если источник interlaced — bob yadif (59.94fps из 29.97fps interlaced)
  const isInterlaced = fieldOrder === 'tt' || fieldOrder === 'bb'
  if (isInterlaced) {
    const parity = fieldOrder === 'tt' ? 'tff' : 'bff'
    parts.push(`yadif=mode=0:parity=${parity}`)
  }

  // Денойз перед апскейлом (уменьшает зерно, encoder видит проще картинку)
  if (denoiseEnabled) {
    parts.push('hqdn3d=4:3:6:4.5')
  }

  // Нормализация SAR и апскейл
  parts.push(
    `setsar=1`,
    `scale=${displayWidth}:${height}:flags=lanczos`,
    `libplacebo=custom_shader_path='${shaderEsc}':w=${targetW}:h=${targetH}:upscaler=none`,
    `setsar=1`,
  )

  return parts.join(',')
}
