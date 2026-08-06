/**
 * Обёртка над fpcalc (Chromaprint) для извлечения аудио-отпечатков
 *
 * Используется для автоопределения OP/ED через сравнение
 * fingerprints между эпизодами одного аниме.
 */

import { spawn } from 'child_process'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import { createModuleLogger } from './logger'

const log = createModuleLogger('Fpcalc')

/** Имя бинарника */
const FPCALC_BIN = process.platform === 'win32' ? 'fpcalc.exe' : 'fpcalc'

/** Папка платформы */
const PLATFORM_FOLDER = process.platform === 'win32' ? 'win' : process.platform === 'linux' ? 'linux' : 'mac'

/** Кэш пути к fpcalc */
let cachedFpcalcPath: string | null = null

/**
 * Получить путь к fpcalc
 * Ищет в resources/fpcalc/{platform}/ (бандлед) или возвращает null
 */
export function getFpcalcPath(): string | null {
  if (cachedFpcalcPath !== null) {
    return cachedFpcalcPath || null
  }

  const isDev = !app.isPackaged

  // Production: resources/fpcalc/
  if (!isDev) {
    const resourcesPath = process.resourcesPath || path.join(app.getAppPath(), '..')
    const prodPath = path.join(resourcesPath, 'fpcalc', FPCALC_BIN)
    if (fs.existsSync(prodPath)) {
      cachedFpcalcPath = prodPath
      log.info('Using bundled fpcalc', { path: prodPath })
      return prodPath
    }
  }

  // Development: resources/fpcalc/{platform}/
  const possibleRoots = [app.getAppPath(), path.join(app.getAppPath(), '..'), path.resolve(__dirname, '..', '..')]

  for (const root of possibleRoots) {
    const platformPath = path.join(root, 'resources', 'fpcalc', PLATFORM_FOLDER, FPCALC_BIN)
    if (fs.existsSync(platformPath)) {
      cachedFpcalcPath = platformPath
      log.info('Using bundled fpcalc', { path: platformPath })
      return platformPath
    }
  }

  // fpcalc не найден
  cachedFpcalcPath = ''
  log.warn('fpcalc not found', {
    platform: process.platform,
    arch: process.arch,
    checkedPaths: possibleRoots.map((root) => path.join(root, 'resources', 'fpcalc', PLATFORM_FOLDER, FPCALC_BIN)),
  })
  return null
}

/**
 * Проверить доступен ли fpcalc
 */
export function isFpcalcAvailable(): boolean {
  return getFpcalcPath() !== null
}

/**
 * Извлечь аудио-отпечаток из файла
 *
 * fpcalc не поддерживает `-offset`, поэтому:
 * - startSec === 0: запускаем fpcalc напрямую с `-length`
 * - startSec > 0: используем ffmpeg для извлечения аудио-сегмента через pipe
 *
 * @param filePath — путь к медиафайлу
 * @param startSec — начало фрагмента (секунды)
 * @param durationSec — длительность фрагмента (секунды)
 * @returns массив uint32 raw fingerprint (~0.128 сек/точка)
 */
export async function extractFingerprint(
  filePath: string,
  startSec: number,
  durationSec: number,
): Promise<Uint32Array> {
  const fpcalcPath = getFpcalcPath()
  if (!fpcalcPath) {
    throw new Error('fpcalc недоступен. Запустите: nx download-fpcalc animatrona')
  }

  if (startSec > 0) {
    // Для ненулевого смещения: ffmpeg извлекает аудио → pipe в fpcalc
    return extractFingerprintWithFfmpeg(fpcalcPath, filePath, startSec, durationSec)
  }

  // Без смещения: fpcalc напрямую
  const args = ['-raw', '-plain', '-length', String(Math.round(durationSec)), filePath]

  return runFpcalc(fpcalcPath, args)
}

/**
 * Извлечь fingerprint через ffmpeg (для ненулевого offset)
 *
 * ffmpeg извлекает аудио-сегмент во временный WAV файл,
 * затем fpcalc анализирует его напрямую.
 */
async function extractFingerprintWithFfmpeg(
  fpcalcPath: string,
  filePath: string,
  startSec: number,
  durationSec: number,
): Promise<Uint32Array> {
  const { runFFmpeg } = await import('./ffmpeg-spawn')
  const os = await import('os')

  // Временный WAV файл для сегмента
  const tempWav = path.join(os.tmpdir(), `animatrona-fp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.wav`)

  try {
    // Извлекаем аудио-сегмент в WAV
    const ffmpegArgs = [
      '-y',
      '-ss',
      String(Math.round(startSec)),
      '-t',
      String(Math.round(durationSec)),
      '-i',
      filePath,
      '-ac',
      '1',
      '-ar',
      '16000',
      '-v',
      'error',
      tempWav,
    ]

    await runFFmpeg(ffmpegArgs)

    // Запускаем fpcalc на WAV файле (указываем -length, т.к. по умолчанию fpcalc берёт только 120 сек)
    const fpcalcArgs = ['-raw', '-plain', '-length', String(Math.round(durationSec)), tempWav]
    return await runFpcalc(fpcalcPath, fpcalcArgs)
  } finally {
    // Удаляем временный файл
    try {
      await fs.promises.unlink(tempWav)
    } catch {
      // Не критично
    }
  }
}

/**
 * Запустить fpcalc напрямую и вернуть результат
 */
function runFpcalc(fpcalcPath: string, args: string[]): Promise<Uint32Array> {
  return new Promise((resolve, reject) => {
    const proc = spawn(fpcalcPath, args)
    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('error', (err) => {
      log.error(`fpcalc spawn error: ${err.message}`)
      reject(new Error(`fpcalc spawn error: ${err.message}`))
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        log.error(`fpcalc exited with code ${code}, stderr: ${stderr.slice(-500)}`)
        reject(new Error(`fpcalc exited with code ${code}: ${stderr.slice(-500)}`))
        return
      }

      if (stderr) {
        log.warn(`fpcalc stderr (code 0): ${stderr.slice(-200)}`)
      }

      resolve(parseFpcalcOutput(stdout))
    })
  })
}

/**
 * Парсит вывод fpcalc -raw -plain в Uint32Array
 */
function parseFpcalcOutput(stdout: string): Uint32Array {
  // fpcalc -raw -plain выводит числа через запятую (signed int32)
  // Формат: FINGERPRINT=1234,-5678,9012,...
  // Или с -plain: просто числа через запятую
  let data = stdout.trim()

  // Убираем префикс FINGERPRINT= если есть
  const fpPrefix = 'FINGERPRINT='
  const fpIdx = data.indexOf(fpPrefix)
  if (fpIdx !== -1) {
    data = data.substring(fpIdx + fpPrefix.length)
  }

  // Также может быть DURATION=... на первой строке
  const lines = data.split('\n')
  const fpLine = lines.find((l) => !l.startsWith('DURATION=') && l.trim().length > 0) ?? ''

  if (!fpLine) {
    return new Uint32Array(0)
  }

  const numbers = fpLine.split(',').map((s) => {
    const n = parseInt(s.trim(), 10)
    // Конвертируем signed int32 → unsigned uint32
    return n < 0 ? n + 0x100000000 : n
  })

  return new Uint32Array(numbers)
}
