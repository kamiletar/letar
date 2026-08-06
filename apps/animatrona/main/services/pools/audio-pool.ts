/**
 * AudioPool — пул для параллельного кодирования аудио на CPU
 *
 * Особенности:
 * - Использует все доступные ядра CPU
 * - FFmpeg с -threads 0 для максимальной параллелизации
 * - Все аудиодорожки из всех серий в одной очереди
 *
 * Наследуется от BasePool — общая логика queue/pause/cancel
 */

import * as os from 'os'
import type { TranscodeProgressExtended } from '../../../shared/types'
import type { AudioPoolTask } from '../../../shared/types/parallel-transcode'
import { getVideoDuration } from '../../ffmpeg/probe'
import { parseTimeToSeconds } from '../../ffmpeg/progress-parser'
import { spawnFFmpeg } from '../../utils/ffmpeg-spawn'
import { BasePool } from './base-pool'

/** Интервал интерполяции прогресса аудио между отчётами FFmpeg (мс) */
const INTERPOLATION_INTERVAL_MS = 100

/** Максимальное молчание FFmpeg до которого интерполируем (мс) */
const INTERPOLATION_MAX_SILENCE_MS = 10_000

/** Трекер последнего аудио-прогресса для интерполяции */
interface AudioProgressTracker {
  lastTime: number // последнее отчётное currentTime (секунды видео)
  lastRealTime: number // момент получения отчёта (Date.now())
  lastSpeed: number // скорость кодирования (из FFmpeg speed=Nx)
}

/**
 * Парсинг расширенных метрик из FFmpeg (для аудио)
 */
function parseFFmpegProgress(
  str: string,
  duration: number,
  startTime: number,
): Partial<TranscodeProgressExtended> | null {
  const time = parseTimeToSeconds(str)
  if (time === null) {
    return null
  }

  const result: Partial<TranscodeProgressExtended> = {
    currentTime: time,
    totalDuration: duration,
    percent: Math.min(100, (time / duration) * 100),
    stage: 'audio',
    elapsedTime: Date.now() - startTime,
  }

  // Speed
  const speedMatch = str.match(/speed=\s*([\d.]+)x/)
  if (speedMatch) {
    result.speed = parseFloat(speedMatch[1])
  }

  // Bitrate
  const bitrateMatch = str.match(/bitrate=\s*([\d.]+)kbits/)
  if (bitrateMatch) {
    result.bitrate = parseFloat(bitrateMatch[1])
  }

  // Size
  const sizeMatch = str.match(/size=\s*(\d+)kB/)
  if (sizeMatch) {
    result.outputSize = parseInt(sizeMatch[1], 10) * 1024
  }

  // ETA
  if (result.speed && result.speed > 0) {
    const remaining = duration - time
    result.eta = remaining / result.speed
  }

  return result
}

export class AudioPool extends BasePool<AudioPoolTask> {
  /** Трекеры прогресса для интерполяции между отчётами FFmpeg */
  private audioTrackerMap = new Map<string, AudioProgressTracker>()

  /** Интервал интерполяции прогресса */
  private interpolationInterval: ReturnType<typeof setInterval> | null = null

  constructor(config?: { maxConcurrent?: number }) {
    // По умолчанию: все ядра CPU
    super(config?.maxConcurrent ?? os.cpus().length)
    this.startInterpolation()
  }

  /** Остановить интерполяцию */
  stopInterpolation(): void {
    if (this.interpolationInterval) {
      clearInterval(this.interpolationInterval)
      this.interpolationInterval = null
    }
  }

  private startInterpolation(): void {
    if (this.interpolationInterval) {
      return
    }
    this.interpolationInterval = setInterval(() => {
      this.emitInterpolatedProgress()
    }, INTERPOLATION_INTERVAL_MS)
  }

  /**
   * Интерполируем прогресс пока FFmpeg молчит между отчётами.
   * Для аудио нет multipass, но ~500мс между отчётами при 30x скорости
   * дают прыжки ~1% — интерполяция убирает их.
   */
  private emitInterpolatedProgress(): void {
    const now = Date.now()

    for (const [taskId, running] of this.runningTasks) {
      const task = running.task
      if (task.status !== 'running' || !task.progress) {
        continue
      }

      const tracker = this.audioTrackerMap.get(taskId)
      if (!tracker || tracker.lastSpeed <= 0) {
        continue
      }

      const elapsedSinceReport = now - tracker.lastRealTime

      if (elapsedSinceReport < INTERPOLATION_INTERVAL_MS) {
        continue
      }
      if (elapsedSinceReport > INTERPOLATION_MAX_SILENCE_MS) {
        continue
      }

      const duration = task.progress.totalDuration
      if (!duration || duration <= 0) {
        continue
      }

      // Оцениваем текущее время: lastTime + elapsed * speed
      const estimatedTime = tracker.lastTime + (elapsedSinceReport / 1000) * tracker.lastSpeed
      const estimatedPercent = Math.min(100, (estimatedTime / duration) * 100)

      if (estimatedPercent <= (task.progress.percent ?? 0) + 0.05) {
        continue
      }

      const eta = tracker.lastSpeed > 0
        ? Math.max(0, (duration - estimatedTime) / tracker.lastSpeed)
        : (task.progress.eta ?? 0)

      this.emit('taskProgress', taskId, {
        ...task.progress,
        currentTime: estimatedTime,
        percent: estimatedPercent,
        eta,
      })
    }
  }

  // === Защищённые методы ===

  protected getStage(): 'audio' {
    return 'audio'
  }

  protected clampMaxConcurrent(value: number): number {
    // Ограничиваем между 1 и количеством ядер CPU
    const cpuCount = os.cpus().length
    return Math.max(1, Math.min(value, cpuCount))
  }

  // === Приватные методы ===

  /** Запуск задачи */
  protected async runTask(task: AudioPoolTask): Promise<void> {
    task.status = 'running'
    const startTime = Date.now()

    // Добавляем в runningTasks (process=null, aborted=false)
    this.markTaskRunning(task, startTime)
    this.emit('taskStarted', task)

    try {
      // Passthrough с input=output: файл уже готов после demux, FFmpeg не нужен
      // Просто завершаем задачу — событие taskCompleted загрузит файл в IPFS
      if (task.passthrough && task.inputPath === task.outputPath) {
        const duration = await getVideoDuration(task.inputPath)
        this.completeTask(task, duration)
        return
      }

      const duration = await getVideoDuration(task.inputPath)

      // Проверяем флаг отмены ПОСЛЕ async операции
      const running = this.runningTasks.get(task.id)
      if (!running || running.aborted) {
        // Задача была отменена во время getVideoDuration()
        this.processQueue()
        return
      }

      const args = this.buildFFmpegArgs(task)
      const ff = spawnFFmpeg(args)

      // Обновляем process
      this.updateTaskProcess(task.id, ff)

      let stderrBuffer = ''

      ff.stderr.on('data', (data: Buffer) => {
        stderrBuffer += data.toString()

        // Парсим построчно (поддержка \r, \n и \r\n для Windows/Unix/Mac)
        const lines = stderrBuffer.split(/\r\n|\r|\n/)
        stderrBuffer = lines.pop() || ''

        for (const line of lines) {
          const progress = parseFFmpegProgress(line, duration, startTime)
          if (progress) {
            task.progress = {
              percent: progress.percent ?? 0,
              currentTime: progress.currentTime ?? 0,
              totalDuration: duration,
              eta: progress.eta ?? 0,
              stage: 'audio',
              trackId: task.trackId,
              speed: progress.speed,
              bitrate: progress.bitrate,
              outputSize: progress.outputSize,
              elapsedTime: progress.elapsedTime,
              startedAt: new Date(startTime).toISOString(),
            }
            // Обновляем трекер для интерполяции
            if (progress.speed && progress.speed > 0) {
              this.audioTrackerMap.set(task.id, {
                lastTime: progress.currentTime ?? 0,
                lastRealTime: Date.now(),
                lastSpeed: progress.speed,
              })
            }
            this.emit('taskProgress', task.id, task.progress)
          }
        }
      })

      ff.on('close', (code: number | null) => {
        this.audioTrackerMap.delete(task.id)
        if (code === 0) {
          this.completeTask(task, duration)
        } else if (task.status === 'cancelled') {
          this.handleTaskCancelled(task)
        } else {
          this.failTask(task, `FFmpeg audio transcode exited with code ${code}`)
        }
      })

      ff.on('error', (err: Error) => {
        this.failTask(task, err.message)
      })
    } catch (err) {
      // Ошибка до spawn()
      this.failTask(task, err instanceof Error ? err.message : String(err))
    }
  }

  /** Построить аргументы FFmpeg */
  private buildFFmpegArgs(task: AudioPoolTask): string[] {
    const { options, inputPath, outputPath, useStreamMapping, trackIndex, syncOffset, passthrough } = task

    const args: string[] = ['-y', '-hide_banner', '-threads', '0']

    // Положительное смещение: донор опережает → обрезать начало через -ss (до -i)
    if (syncOffset && syncOffset > 0) {
      args.push('-ss', (syncOffset / 1000).toFixed(3))
    }

    args.push('-i', inputPath)

    // Если работаем с исходным MKV — указываем конкретную аудиодорожку
    // Без этого FFmpeg возьмёт первую аудиодорожку по умолчанию
    if (useStreamMapping) {
      args.push('-map', `0:a:${trackIndex}`)
    }

    // Passthrough режим — копируем аудио без транскодирования
    // Используется для AAC ≤256kbps и MP3, которые не нуждаются в перекодировании
    if (passthrough) {
      args.push(
        '-c:a',
        'copy',
        '-vn', // Без видео
      )
    } else {
      // Отрицательное смещение: донор отстаёт → добавить тишину через adelay
      // Применяется только при транскодировании (copy не поддерживает фильтры)
      if (syncOffset && syncOffset < 0) {
        const delayMs = Math.abs(syncOffset)
        // adelay формат: delay_left|delay_right (для стерео)
        // Для многоканального аудио (5.1, 7.1) — все каналы получат одинаковую задержку
        args.push(
          '-af',
          `adelay=${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}`,
        )
      }

      args.push(
        '-c:a',
        'aac',
        '-b:a',
        `${options.targetBitrate}k`,
        '-vn', // Без видео
      )

      // Опциональные параметры (только при транскодировании)
      if (options.sampleRate) {
        args.push('-ar', options.sampleRate.toString())
      }
      if (options.channels) {
        args.push('-ac', options.channels.toString())
      }
    }

    args.push(outputPath)

    return args
  }
}
