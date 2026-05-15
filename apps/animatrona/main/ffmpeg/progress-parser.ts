/**
 * Парсер прогресса FFmpeg
 *
 * Извлекает расширенную информацию из stderr вывода FFmpeg:
 * - fps (кадров в секунду)
 * - speed (скорость относительно реального времени)
 * - bitrate (битрейт выходного файла)
 * - size (размер выходного файла)
 * - frame (текущий кадр)
 * - time (текущая позиция)
 */

import type { TranscodeProgressExtended } from '../../shared/types'
import { calculateCompressionRatio, formatBytes, formatDurationHuman } from '../../shared/utils/format'

/**
 * Парсинг времени из вывода FFmpeg
 * Поддержка форматов: HH:MM:SS, HH:MM:SS.c, HH:MM:SS.cc, HH:MM:SS.ccc
 *
 * @param str - Строка с time=HH:MM:SS.xxx
 * @returns Время в секундах или null если не найдено
 */
export function parseTimeToSeconds(str: string): number | null {
  const match = str.match(/time=(\d+):(\d+):(\d+)(?:\.(\d+))?/)
  if (!match) {
    return null
  }
  const [, hours, minutes, seconds, fraction] = match
  const fractionValue = fraction ? parseFloat(`0.${fraction}`) : 0
  return parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10) + fractionValue
}

/**
 * Парсит строку прогресса FFmpeg
 *
 * Примеры входных строк:
 * frame=  120 fps= 45 q=28.0 size=    1234kB time=00:00:05.00 bitrate= 2021.5kbits/s speed=1.87x
 * frame= 1500 fps=120.5 q=24.0 Lsize=   45678kB time=00:01:00.00 bitrate=6234.5kbits/s speed=2.00x
 *
 * @param line - Строка stderr от FFmpeg
 * @returns Частичный объект TranscodeProgressExtended
 */
export function parseFFmpegProgress(line: string): Partial<TranscodeProgressExtended> {
  const result: Partial<TranscodeProgressExtended> = {}

  // fps=XX или fps= XX.X
  const fpsMatch = line.match(/fps=\s*([\d.]+)/)
  if (fpsMatch) {
    result.fps = parseFloat(fpsMatch[1])
  }

  // speed=X.XXx или speed= X.XXx
  const speedMatch = line.match(/speed=\s*([\d.]+)x/)
  if (speedMatch) {
    result.speed = parseFloat(speedMatch[1])
  }

  // bitrate=XXXkbits/s или bitrate= XXX.Xkbits/s
  const bitrateMatch = line.match(/bitrate=\s*([\d.]+)kbits/)
  if (bitrateMatch) {
    result.bitrate = parseFloat(bitrateMatch[1])
  }

  // size=XXXkB или Lsize=XXXkB (L = last)
  const sizeMatch = line.match(/L?size=\s*(\d+)kB/)
  if (sizeMatch) {
    // Конвертируем kB в bytes
    result.outputSize = parseInt(sizeMatch[1], 10) * 1024
  }

  // frame=XXX
  const frameMatch = line.match(/frame=\s*(\d+)/)
  if (frameMatch) {
    result.currentFrame = parseInt(frameMatch[1], 10)
  }

  // time=HH:MM:SS.mm — конвертируем в секунды
  const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10)
    const minutes = parseInt(timeMatch[2], 10)
    const seconds = parseInt(timeMatch[3], 10)
    const centiseconds = parseInt(timeMatch[4], 10)
    result.currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100
  }

  return result
}

/**
 * Проверяет, содержит ли строка данные прогресса
 *
 * @param line - Строка для проверки
 * @returns true если строка содержит прогресс
 */
export function isProgressLine(line: string): boolean {
  return line.includes('frame=') && line.includes('time=')
}

/**
 * Рассчитывает ETA на основе прогресса
 *
 * @param progress - Текущий прогресс
 * @param totalDuration - Общая длительность в секундах
 * @returns ETA в секундах или undefined если невозможно рассчитать
 */
export function calculateETA(progress: Partial<TranscodeProgressExtended>, totalDuration: number): number | undefined {
  // Метод 1: через speed
  if (progress.speed && progress.speed > 0 && progress.currentTime) {
    const remaining = totalDuration - progress.currentTime
    return remaining / progress.speed
  }

  // Метод 2: через fps и общее количество кадров
  if (progress.fps && progress.fps > 0 && progress.currentFrame && progress.totalFrames) {
    const remainingFrames = progress.totalFrames - progress.currentFrame
    return remainingFrames / progress.fps
  }

  // Метод 3: через elapsedTime и прогресс
  if (progress.elapsedTime && progress.currentTime && progress.currentTime > 0) {
    const progressRatio = progress.currentTime / totalDuration
    if (progressRatio > 0 && progressRatio < 1) {
      const totalEstimatedTime = progress.elapsedTime / progressRatio
      return (totalEstimatedTime - progress.elapsedTime) / 1000 // в секунды
    }
  }

  return undefined
}

// Реэкспорт из shared для обратной совместимости
export { calculateCompressionRatio, formatBytes, formatDurationHuman as formatDuration }
