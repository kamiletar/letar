/**
 * VideoPool — пул для параллельного кодирования видео на GPU
 *
 * Особенности RTX 5080 Dual Encoders:
 * - 2 независимых NVENC энкодера
 * - Каждый может кодировать отдельный поток параллельно
 * - Распределение через счётчик активных задач
 *
 * Наследуется от BasePool — общая логика queue/pause/cancel
 */

import type { TranscodeProgressExtended } from '../../../shared/types'
import type { VideoPoolTask } from '../../../shared/types/parallel-transcode'
import { buildAnime4KFilter } from '../../ffmpeg/anime4k'
import { getVideoInfo } from '../../ffmpeg/probe'
import { parseTimeToSeconds } from '../../ffmpeg/progress-parser'
import { prisma } from '../../utils/db'
import { getFFmpegPath } from '../../utils/ffmpeg-installer'
import { spawnFFmpeg } from '../../utils/ffmpeg-spawn'
import { createModuleLogger } from '../../utils/logger'
import { BasePool } from './base-pool'

const log = createModuleLogger('VideoPool')

/** ACCESS_VIOLATION exit code (0xC0000005) — NVENC crash */
const NVENC_CRASH_CODE = 3221225477

/**
 * Парсинг расширенных метрик из FFmpeg (для видео)
 *
 * @param str - Строка вывода FFmpeg
 * @param duration - Длительность видео в секундах (из probe)
 * @param startTime - Время начала кодирования (для ETA)
 * @param sourceFps - FPS исходного видео (из probe) — используется вместо парсинга из stdout
 */
function parseFFmpegProgress(
  str: string,
  duration: number,
  startTime: number,
  sourceFps: number,
): Partial<TranscodeProgressExtended> | null {
  // Парсим frame — более надёжный индикатор прогресса чем time (особенно с multipass)
  const frameMatch = str.match(/frame=\s*(\d+)/)
  if (!frameMatch) {
    return null
  }
  const currentFrame = parseInt(frameMatch[1], 10)

  // Парсим time как fallback
  const time = parseTimeToSeconds(str)

  // Используем sourceFps из probe — FFmpeg при multipass/lookahead выдаёт искажённый fps!
  const totalFrames = Math.round(duration * sourceFps)
  const percent = totalFrames > 0 ? Math.min(100, (currentFrame / totalFrames) * 100) : 0

  // FPS из stdout — только для отображения скорости кодирования
  const fpsMatch = str.match(/fps=\s*([\d.]+)/)
  const displayFps = fpsMatch ? parseFloat(fpsMatch[1]) : undefined

  const result: Partial<TranscodeProgressExtended> = {
    currentTime: time ?? currentFrame / sourceFps, // fallback по frame
    totalDuration: duration,
    percent,
    stage: 'video',
    elapsedTime: Date.now() - startTime,
    currentFrame,
    fps: displayFps,
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

  // ETA (используем currentTime который уже вычислен)
  if (result.speed && result.speed > 0 && result.currentTime !== undefined) {
    const remaining = duration - result.currentTime
    result.eta = remaining / result.speed
  }

  return result
}

/** Максимальное количество точек в истории FPS */
const MAX_FPS_HISTORY = 20

/** Минимальный интервал между обновлениями fps (мс) для стабильности расчёта */
const FPS_UPDATE_INTERVAL_MS = 500

/** Состояние для расчёта fps на основе frames */
interface FpsTracker {
  prevFrame: number
  prevTime: number
  lastFps: number
}

/** Максимальное количество строк лога на задачу */
const MAX_LOG_LINES = 500

/** Интервал интерполяции прогресса между отчётами FFmpeg (мс) */
const INTERPOLATION_INTERVAL_MS = 100

/** Максимальное время молчания FFmpeg, до которого интерполируем (мс) */
const INTERPOLATION_MAX_SILENCE_MS = 10_000

/** Тип записи лога */
export interface LogEntry {
  timestamp: number
  taskId: string
  level: 'info' | 'warning' | 'error'
  message: string
}

/**
 * Circular buffer для логов FFmpeg
 * Хранит последние N строк, автоматически удаляя старые
 */
class CircularLogBuffer {
  private buffer: LogEntry[] = []
  private maxSize: number

  constructor(maxSize = MAX_LOG_LINES) {
    this.maxSize = maxSize
  }

  push(entry: LogEntry): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift()
    }
    this.buffer.push(entry)
  }

  getAll(): LogEntry[] {
    return [...this.buffer]
  }

  getForTask(taskId: string): LogEntry[] {
    return this.buffer.filter((e) => e.taskId === taskId)
  }

  clear(): void {
    this.buffer = []
  }

  clearForTask(taskId: string): void {
    this.buffer = this.buffer.filter((e) => e.taskId !== taskId)
  }

  /** Получить количество записей */
  size(): number {
    return this.buffer.length
  }
}

/**
 * Определить уровень лога из строки FFmpeg
 * FFmpeg выводит предупреждения и ошибки в stderr
 */
function parseLogLevel(line: string): 'info' | 'warning' | 'error' {
  const lowerLine = line.toLowerCase()
  if (
    lowerLine.includes('[error]')
    || lowerLine.includes('error:')
    || lowerLine.includes('failed')
    || lowerLine.includes('invalid')
  ) {
    return 'error'
  }
  if (
    lowerLine.includes('[warning]')
    || lowerLine.includes('warning:')
    || lowerLine.includes('discarding')
    || lowerLine.includes('discarded')
  ) {
    return 'warning'
  }
  return 'info'
}

export class VideoPool extends BasePool<VideoPoolTask> {
  /**
   * Глобальный CPU fallback — NVENC crash зафиксирован
   * Все последующие задачи будут использовать libsvtav1
   */
  private globalCpuFallback = false

  /**
   * Причина активации CPU fallback:
   * - 'crash' — NVENC crash (0xC0000005), НЕ сбрасывается автоматически
   * - 'settings' — Settings.useGpu = false, сбрасывается при включении GPU
   * - 'vmaf' — VMAF определил недоступность GPU
   */
  private cpuFallbackReason: 'crash' | 'settings' | 'vmaf' | null = null

  /** Сохранённое значение maxConcurrent до CPU fallback */
  private savedMaxConcurrent: number | null = null

  /** История FPS для каждой задачи (для sparkline графиков) */
  private fpsHistoryMap = new Map<string, number[]>()

  /** Трекер для расчёта fps на основе frames (вместо ненадёжного FFmpeg fps) */
  private fpsTrackerMap = new Map<string, FpsTracker>()

  /** Circular buffer для логов FFmpeg */
  private logBuffer = new CircularLogBuffer()

  /** Интервал watchdog для проверки зависших задач */
  private watchdogInterval: ReturnType<typeof setInterval> | null = null

  /** Интервал интерполяции прогресса между отчётами FFmpeg */
  private interpolationInterval: ReturnType<typeof setInterval> | null = null

  /** Таймаут отсутствия прогресса (5 минут) */
  private static readonly STALLED_TIMEOUT_MS = 5 * 60 * 1000

  /** Последнее обновление прогресса для каждой задачи */
  private lastProgressUpdate = new Map<string, number>()

  constructor(config?: { maxConcurrent?: number }) {
    super(config?.maxConcurrent ?? 2)
    // Запускаем watchdog для проверки зависших задач
    this.startWatchdog()
    // Запускаем интерполяцию прогресса (сглаживает прыжки при multipass/lookahead)
    this.startInterpolation()
  }

  /**
   * Запустить watchdog для проверки зависших процессов
   * Проверяет каждые 30 секунд:
   * - Жив ли FFmpeg процесс
   * - Был ли прогресс за последние 5 минут
   */
  private startWatchdog(): void {
    if (this.watchdogInterval) {
      return
    }

    this.watchdogInterval = setInterval(() => {
      this.checkStalledTasks()
    }, 30_000) // Проверка каждые 30 сек
  }

  /**
   * Остановить watchdog (при shutdown)
   */
  stopWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval)
      this.watchdogInterval = null
    }
    this.stopInterpolation()
  }

  /**
   * Запустить интерполяцию прогресса
   *
   * FFmpeg сообщает frame= периодически (~500мс), а не для каждого кадра.
   * При multipass (av1_nvenc -multipass qres) NVENC буферизует кадры внутренне,
   * и frame= может «молчать» пока не заполнится буфер → резкий прыжок прогресса.
   *
   * Интерполяция оценивает текущий кадр по формуле:
   *   estimatedFrame = lastReportedFrame + elapsedSeconds * fps
   * и эмитит промежуточные события прогресса со сглаженными значениями.
   */
  private startInterpolation(): void {
    if (this.interpolationInterval) {
      return
    }
    this.interpolationInterval = setInterval(() => {
      this.emitInterpolatedProgress()
    }, INTERPOLATION_INTERVAL_MS)
  }

  /** Остановить интерполяцию прогресса */
  stopInterpolation(): void {
    if (this.interpolationInterval) {
      clearInterval(this.interpolationInterval)
      this.interpolationInterval = null
    }
  }

  /**
   * Эмитит интерполированный прогресс для задач, от которых давно не было отчёта FFmpeg
   *
   * Только если:
   * - Прошло больше INTERPOLATION_INTERVAL_MS с последнего FFmpeg-отчёта (т.е. FFmpeg «молчит»)
   * - Прошло меньше INTERPOLATION_MAX_SILENCE_MS (защита от зависших задач)
   * - Известен FPS (уже считался FpsTracker-ом)
   * - Оценка выше текущего значения (никогда не откатываем прогресс назад)
   */
  private emitInterpolatedProgress(): void {
    const now = Date.now()

    for (const [taskId, running] of this.runningTasks) {
      const task = running.task
      if (task.status !== 'running' || !task.progress) {
        continue
      }

      const tracker = this.fpsTrackerMap.get(taskId)
      if (!tracker || !tracker.lastFps || tracker.lastFps <= 0) {
        continue
      }

      const lastReportTime = this.lastProgressUpdate.get(taskId)
      if (!lastReportTime) {
        continue
      }

      const elapsedSinceReport = now - lastReportTime

      // FFmpeg только что отчитался — не нужна интерполяция
      if (elapsedSinceReport < INTERPOLATION_INTERVAL_MS) {
        continue
      }

      // FFmpeg молчит слишком долго — вероятно задача зависла, не интерполируем
      if (elapsedSinceReport > INTERPOLATION_MAX_SILENCE_MS) {
        continue
      }

      const lastFrame = task.progress.currentFrame ?? 0
      const sourceFps = task.sourceFps ?? 24
      const totalFrames = Math.round(task.progress.totalDuration * sourceFps)
      if (totalFrames <= 0) {
        continue
      }

      // Оцениваем текущий кадр линейной интерполяцией по известному FPS
      const estimatedFrame = lastFrame + (elapsedSinceReport / 1000) * tracker.lastFps
      const estimatedPercent = Math.min(100, (estimatedFrame / totalFrames) * 100)

      // Не откатываем прогресс назад (только вперёд)
      if (estimatedPercent <= (task.progress.percent ?? 0) + 0.05) {
        continue
      }

      const estimatedCurrentTime = estimatedFrame / sourceFps
      const eta = task.progress.speed && task.progress.speed > 0
        ? Math.max(0, (task.progress.totalDuration - estimatedCurrentTime) / task.progress.speed)
        : (task.progress.eta ?? 0)

      this.emit('taskProgress', taskId, {
        ...task.progress,
        currentFrame: Math.round(estimatedFrame),
        percent: estimatedPercent,
        currentTime: estimatedCurrentTime,
        eta,
      })
    }
  }

  /**
   * Проверить зависшие задачи
   */
  private checkStalledTasks(): void {
    const now = Date.now()

    for (const [taskId, task] of this.runningTasks) {
      // Проверяем только активные задачи (не на паузе)
      if (task.status !== 'running') {
        continue
      }

      const process = task.process
      const lastUpdate = this.lastProgressUpdate.get(taskId) ?? task.startedAt ?? now

      // 1. Проверка: процесс существует и жив?
      if (process && process.exitCode !== null) {
        // Процесс завершился, но событие 'close' не дошло
        log.warn('Watchdog: FFmpeg process exited without close event', {
          taskId,
          exitCode: process.exitCode,
        })
        this.failTask(task, `FFmpeg процесс завершился без события close (код ${process.exitCode})`)
        this.lastProgressUpdate.delete(taskId)
        continue
      }

      // 2. Проверка: был ли прогресс за последние 5 минут?
      const timeSinceUpdate = now - lastUpdate
      if (timeSinceUpdate > VideoPool.STALLED_TIMEOUT_MS) {
        log.warn('Watchdog: Task stalled - no progress for 5 minutes', {
          taskId,
          timeSinceUpdateMs: timeSinceUpdate,
          lastProgress: task.progress?.percent,
        })

        // Убиваем процесс если он ещё жив
        if (process && process.exitCode === null) {
          try {
            process.kill('SIGKILL')
          } catch (e) {
            log.warn('Failed to kill stalled FFmpeg process', { taskId, error: e })
          }
        }

        this.failTask(task, `Задача зависла — нет прогресса более 5 минут`)
        this.lastProgressUpdate.delete(taskId)
      }
    }
  }

  // === Публичные методы (специфичные для VideoPool) ===

  /** Проверить активен ли глобальный CPU fallback */
  isGlobalCpuFallback(): boolean {
    return this.globalCpuFallback
  }

  // === Методы для работы с логами ===

  /** Получить все логи (все задачи) */
  getAllLogs(): LogEntry[] {
    return this.logBuffer.getAll()
  }

  /** Получить логи конкретной задачи */
  getTaskLogs(taskId: string): LogEntry[] {
    return this.logBuffer.getForTask(taskId)
  }

  /** Очистить все логи */
  clearAllLogs(): void {
    this.logBuffer.clear()
  }

  /** Очистить логи конкретной задачи */
  clearTaskLogs(taskId: string): void {
    this.logBuffer.clearForTask(taskId)
  }

  /** Получить количество записей в логе */
  getLogCount(): number {
    return this.logBuffer.size()
  }

  /**
   * Активировать CPU режим из VMAF результата
   * Вызывается когда VMAF определил, что GPU недоступен заранее
   */
  activateCpuModeFromVmaf(): void {
    if (this.globalCpuFallback) {
      return // Уже активирован
    }

    this.globalCpuFallback = true
    this.cpuFallbackReason = 'vmaf'

    // Сохраняем текущий maxConcurrent для возможного восстановления
    this.savedMaxConcurrent = this.maxConcurrent

    // libsvtav1 использует все ядра CPU — только 1 поток
    this.maxConcurrent = 1

    log.info('CPU режим активирован из VMAF', {
      maxConcurrentBefore: this.savedMaxConcurrent,
      maxConcurrentAfter: 1,
    })

    // Уведомляем UI
    this.emit('globalCpuFallback', { reason: 'VMAF detected GPU unavailable', tasksAffected: this.queue.length })
  }

  // === Защищённые методы ===

  protected getStage(): 'video' {
    return 'video'
  }

  protected clampMaxConcurrent(value: number): number {
    // При активном CPU fallback — только 1 поток (libsvtav1 использует все ядра)
    if (this.globalCpuFallback) {
      return 1
    }
    // Ограничиваем между 1 и 8 (для тестирования мощных GPU)
    return Math.max(1, Math.min(value, 8))
  }

  protected onTaskQueued(task: VideoPoolTask): void {
    // Если глобальный CPU fallback активен — новая задача тоже на CPU
    if (this.globalCpuFallback) {
      task.useCpuFallback = true
      return
    }

    // Если задача приходит с useCpuFallback=true (из VMAF) — активируем CPU режим
    if (task.useCpuFallback) {
      this.activateCpuModeFromVmaf()
    }
  }

  protected onTaskCompleted(_task: VideoPoolTask): void {
    this.checkAutoResetCpuFallback()
  }

  protected onClear(): void {
    // Сбрасываем глобальный CPU fallback
    this.resetGlobalCpuFallback()
  }

  /**
   * Переопределяем processQueue для синхронной проверки CPU mode
   *
   * Проблема: при maxConcurrent=2, базовый processQueue запускает 2 задачи
   * одновременно через runTask() (async без await). Вторая задача стартует
   * до того как первая успеет проверить getGlobalSettings() и активировать
   * CPU режим → обе получают GPU → 2 потока CPU вместо 1.
   *
   * Фикс: перед вызовом super.processQueue() проверяем первую задачу —
   * если она уже помечена useCpuFallback, активируем CPU режим синхронно.
   */
  protected processQueue(): void {
    // Проверяем первую задачу в очереди — если CPU fallback нужен, активируем сразу
    if (!this.globalCpuFallback && this.queue.length > 0) {
      const firstTask = this.queue[0]
      if (firstTask.useCpuFallback) {
        this.activateCpuModeFromVmaf()
      }
    }
    super.processQueue()
  }

  // === Приватные методы ===

  /**
   * Активировать глобальный CPU fallback после NVENC crash
   * - Все задачи в очереди переключаются на libsvtav1
   * - Параллельность снижается до 1 (libsvtav1 использует все ядра)
   */
  private activateGlobalCpuFallback(): void {
    if (this.globalCpuFallback) {
      return // Уже активирован
    }

    this.globalCpuFallback = true
    this.cpuFallbackReason = 'crash' // NVENC crash — НЕ сбрасывается автоматически

    // Сохраняем текущий maxConcurrent для возможного восстановления
    this.savedMaxConcurrent = this.maxConcurrent

    // libsvtav1 использует все ядра CPU — только 1 поток
    this.maxConcurrent = 1

    // Помечаем все задачи в очереди для CPU
    for (const task of this.queue) {
      task.useCpuFallback = true
    }

    // Уведомляем UI
    this.emit('globalCpuFallback', { reason: 'NVENC crash detected', tasksAffected: this.queue.length })
  }

  /**
   * Авто-сброс crash fallback после завершения батча
   *
   * Если причина CPU fallback — NVENC crash, сбрасываем после того как
   * все задачи завершены (очередь пуста и нет запущенных).
   * Это предотвращает "заражение" следующих аниме.
   */
  private checkAutoResetCpuFallback(): void {
    if (
      this.globalCpuFallback
      && this.cpuFallbackReason === 'crash'
      && this.runningTasks.size === 0
      && this.queue.length === 0
    ) {
      log.info('Авто-сброс CPU fallback после crash — батч завершён')
      this.resetGlobalCpuFallback()
    }
  }

  /** Сбросить глобальный CPU fallback (при clear или включении GPU в настройках) */
  private resetGlobalCpuFallback(): void {
    if (this.globalCpuFallback && this.savedMaxConcurrent !== null) {
      this.maxConcurrent = this.savedMaxConcurrent
    }
    this.globalCpuFallback = false
    this.cpuFallbackReason = null
    this.savedMaxConcurrent = null
  }

  /**
   * Получить глобальные настройки из БД
   */
  private async getGlobalSettings(): Promise<{ useGpu: boolean } | null> {
    try {
      const settings = await prisma.settings.findFirst()
      return settings ? { useGpu: settings.useGpu } : null
    } catch (err) {
      log.warn('Failed to get global settings', { error: String(err) })
      return null
    }
  }

  /**
   * Активировать CPU режим из-за глобальной настройки Settings.useGpu = false
   * Аналогично activateGlobalCpuFallback, но сбрасывается при включении GPU в настройках
   */
  private activateCpuModeFromSettings(): void {
    if (this.globalCpuFallback) {
      return // Уже активирован
    }

    this.globalCpuFallback = true
    this.cpuFallbackReason = 'settings' // Сбрасывается при включении GPU

    // Сохраняем текущий maxConcurrent для возможного восстановления
    this.savedMaxConcurrent = this.maxConcurrent

    // libsvtav1 использует все ядра CPU — только 1 поток
    this.maxConcurrent = 1

    // Помечаем все задачи в очереди для CPU
    for (const task of this.queue) {
      task.useCpuFallback = true
    }

    log.info('CPU mode activated due to global settings', { tasksAffected: this.queue.length })
    this.emit('globalCpuFallback', { reason: 'GPU disabled in settings', tasksAffected: this.queue.length })
  }

  /** Получить следующий индекс GPU (распределение между энкодерами) */
  private getNextGpuIndex(): number {
    // Считаем сколько задач на каждом GPU
    const gpuCounts = [0, 0]
    for (const running of this.runningTasks.values()) {
      const idx = running.task.gpuIndex ?? 0
      gpuCounts[idx]++
    }
    // Выбираем GPU с меньшей нагрузкой
    return gpuCounts[0] <= gpuCounts[1] ? 0 : 1
  }

  /** Запуск задачи */
  protected async runTask(task: VideoPoolTask): Promise<void> {
    task.status = 'running'
    task.gpuIndex = this.getNextGpuIndex()
    const startTime = Date.now()
    task.startedAt = startTime // Для расчёта elapsed time в UI

    // Добавляем в runningTasks (process=null, aborted=false)
    this.markTaskRunning(task, startTime)
    this.emit('taskStarted', task)

    try {
      // ВАЖНО: Проверяем глобальные настройки перед каждой задачей
      // Это гарантирует что актуальное значение Settings.useGpu учитывается
      // даже если task был создан до изменения настроек
      const globalSettings = await this.getGlobalSettings()
      if (globalSettings?.useGpu === false && !task.useCpuFallback) {
        log.info('Forcing CPU mode due to global settings', { taskId: task.id })
        task.useCpuFallback = true
        // Активируем CPU режим для всех задач
        if (!this.globalCpuFallback) {
          this.activateCpuModeFromSettings()
        }
      } else if (globalSettings?.useGpu === true && this.globalCpuFallback && this.cpuFallbackReason === 'settings') {
        // GPU включён обратно в настройках — сбрасываем глобальный CPU fallback
        // НЕ трогаем task.useCpuFallback — задача могла прийти с forceCpu=true
        log.info('Restoring GPU mode due to global settings', { taskId: task.id })
        this.resetGlobalCpuFallback()
      }

      // Получаем duration и fps из probe (не из stdout FFmpeg!)
      const videoInfo = await getVideoInfo(task.inputPath)
      const { duration, fps: sourceFps, fieldOrder } = videoInfo

      // Сохраняем sourceFps в задаче для использования в прогрессе
      task.sourceFps = sourceFps

      // Авто-деинтерлейс: сохраняем field_order для buildFFmpegArgs
      task.sourceFieldOrder = fieldOrder

      // Предвычисляем Anime4K фильтр если нужен
      // (Anime4K сам обрабатывает деинтерлейс через probeDisplayInfo)
      if (task.options.anime4kShaderPath) {
        task.anime4kFilter = await buildAnime4KFilter(
          task.inputPath,
          task.options.anime4kShaderPath,
          task.options.denoiseEnabled,
        )
        log.info('Anime4K filter built', { taskId: task.id, filter: task.anime4kFilter })
      }

      // Проверяем флаг отмены ПОСЛЕ async операции
      const running = this.runningTasks.get(task.id)
      if (!running || running.aborted) {
        // Задача была отменена во время getVideoInfo()
        this.completedTasks.push(task)
        this.processQueue()
        return
      }

      const args = this.buildFFmpegArgs(task, duration)

      // Сохраняем полную FFmpeg команду для отображения в UI
      const ffmpegPath = getFFmpegPath()
      task.ffmpegCommand = `"${ffmpegPath}" ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`

      const ff = spawnFFmpeg(args)

      // Обновляем process
      this.updateTaskProcess(task.id, ff)

      let stderrBuffer = ''

      ff.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString()
        stderrBuffer += chunk

        // Парсим построчно (поддержка \r, \n и \r\n для Windows/Unix/Mac)
        const lines = stderrBuffer.split(/\r\n|\r|\n/)
        stderrBuffer = lines.pop() || ''

        for (const line of lines) {
          // Добавляем строку в лог-буфер (если не пустая и не progress update)
          const trimmedLine = line.trim()
          if (trimmedLine && !trimmedLine.startsWith('frame=')) {
            const level = parseLogLevel(trimmedLine)
            this.logBuffer.push({
              timestamp: Date.now(),
              taskId: task.id,
              level,
              message: trimmedLine,
            })
            // Эмитим событие для real-time обновления UI
            this.emit('logEntry', task.id, { timestamp: Date.now(), level, message: trimmedLine })
          }

          // Передаём sourceFps из probe для точного расчёта прогресса
          const progress = parseFFmpegProgress(line, duration, startTime, sourceFps)
          if (progress) {
            // DEBUG: логируем первое обновление прогресса
            if (!task.progress || task.progress.percent === 0) {
              log.debug('Первое обновление прогресса задачи', {
                taskId: task.id.slice(-6),
                percent: progress.percent?.toFixed(1),
              })
            }

            // === Расчёт FPS на основе frames (v0.19.0) ===
            // FFmpeg выдаёт некорректные fps/speed при hardware encoding
            // Считаем сами: fps = deltaFrames / deltaTime
            const now = Date.now()
            const currentFrame = progress.currentFrame ?? 0
            let tracker = this.fpsTrackerMap.get(task.id)

            let calculatedFps: number | undefined
            let calculatedSpeed: number | undefined

            if (!tracker) {
              // Первый вызов — инициализируем трекер
              tracker = { prevFrame: currentFrame, prevTime: now, lastFps: 0 }
              this.fpsTrackerMap.set(task.id, tracker)
            } else {
              const deltaMs = now - tracker.prevTime
              const deltaFrames = currentFrame - tracker.prevFrame

              // Обновляем только если прошло достаточно времени (для стабильности)
              if (deltaMs >= FPS_UPDATE_INTERVAL_MS && deltaFrames > 0) {
                const deltaSeconds = deltaMs / 1000
                calculatedFps = deltaFrames / deltaSeconds
                calculatedSpeed = sourceFps > 0 ? calculatedFps / sourceFps : undefined

                // Сохраняем для следующей итерации
                tracker.prevFrame = currentFrame
                tracker.prevTime = now
                tracker.lastFps = calculatedFps
              } else {
                // Используем предыдущее значение fps
                calculatedFps = tracker.lastFps > 0 ? tracker.lastFps : undefined
                calculatedSpeed = calculatedFps && sourceFps > 0 ? calculatedFps / sourceFps : undefined
              }
            }

            // Обновляем историю FPS для sparkline (используем наш расчёт)
            if (calculatedFps && calculatedFps > 0) {
              let history = this.fpsHistoryMap.get(task.id)
              if (!history) {
                history = []
                this.fpsHistoryMap.set(task.id, history)
              }
              // Добавляем только если значительно отличается от последнего
              const lastValue = history[history.length - 1]
              if (lastValue === undefined || Math.abs(calculatedFps - lastValue) >= 1) {
                history.push(Math.round(calculatedFps))
                // Ограничиваем количество точек
                if (history.length > MAX_FPS_HISTORY) {
                  history.shift()
                }
              }
            }

            task.progress = {
              percent: progress.percent ?? 0,
              currentTime: progress.currentTime ?? 0,
              totalDuration: duration,
              eta: progress.eta ?? 0,
              stage: 'video',
              fps: calculatedFps, // Наш расчёт вместо FFmpeg
              fpsHistory: this.fpsHistoryMap.get(task.id),
              speed: calculatedSpeed, // Наш расчёт вместо FFmpeg
              bitrate: progress.bitrate,
              outputSize: progress.outputSize,
              currentFrame: progress.currentFrame,
              elapsedTime: progress.elapsedTime,
              startedAt: new Date(startTime).toISOString(),
            }
            // Watchdog: обновляем время последнего прогресса
            this.lastProgressUpdate.set(task.id, Date.now())
            this.emit('taskProgress', task.id, task.progress)
          }
        }
      })

      ff.on('close', (code: number | null) => {
        // Сохраняем количество активных воркеров ДО удаления текущей задачи
        const activeWorkersAtCompletion = this.runningTasks.size

        this.runningTasks.delete(task.id)
        this.pausedTasks.delete(task.id)
        // Очищаем историю FPS, трекер и watchdog для завершённой задачи
        this.fpsHistoryMap.delete(task.id)
        this.fpsTrackerMap.delete(task.id)
        this.lastProgressUpdate.delete(task.id)

        // === NVENC crash detection & CPU retry ===
        // Проверяем: NVENC crash (0xC0000005) И ещё не пробовали CPU
        const isNvencCrash = code === NVENC_CRASH_CODE
        const wasUsingGpu = !task.useCpuFallback && !task.preferCpu && task.options.useGpu
        const canRetryWithCpu = isNvencCrash && wasUsingGpu

        if (canRetryWithCpu) {
          // === Активируем ГЛОБАЛЬНЫЙ CPU fallback ===
          // Все задачи (текущая + очередь) переключаются на libsvtav1
          this.activateGlobalCpuFallback()

          // Переключаем на CPU и перезапускаем
          task.useCpuFallback = true
          task.status = 'queued'
          task.error = undefined
          task.progress = null

          // Добавляем в начало очереди для немедленной обработки
          this.queue.unshift(task)
          this.emit('taskRetry', task)
          this.processQueue()
          return
        }

        if (code === 0) {
          // Вычисляем время транскодирования и количество активных воркеров
          if (task.startedAt) {
            task.transcodeDurationMs = Date.now() - task.startedAt
          }
          // Количество активных GPU потоков на момент завершения (включая текущую)
          task.activeGpuWorkers = activeWorkersAtCompletion
          this.completeTask(task, duration)
        } else if (task.status === 'cancelled') {
          this.handleTaskCancelled(task)
        } else {
          this.failTask(task, `FFmpeg video transcode exited with code ${code}`)
        }
      })

      ff.on('error', (err: Error) => {
        this.failTask(task, err.message)
      })
    } catch (err) {
      // Ошибка до spawn() (например в getVideoInfo)
      this.failTask(task, err instanceof Error ? err.message : String(err))
    }
  }

  /** Построить аргументы FFmpeg */
  private buildFFmpegArgs(task: VideoPoolTask, _duration: number): string[] {
    const { options, inputPath, outputPath } = task
    const codec = options.codec || 'av1'

    const args: string[] = ['-y', '-hide_banner']

    // GPU ускорение декодирования (только для NVENC)
    // Явная проверка: useGpu должен быть true (не undefined, не false)
    const useGpu = options.useGpu === true
    const useCpu = task.useCpuFallback || task.preferCpu || !useGpu

    // Логирование выбора GPU/CPU
    log.debug('Выбор GPU/CPU для задачи', {
      taskId: task.id,
      useGpu,
      optionsUseGpu: options.useGpu,
      useCpu,
      fallback: task.useCpuFallback,
      preferCpu: task.preferCpu,
    })

    if (!useCpu) {
      args.push('-hwaccel', 'cuda')
      // Примечание: -hwaccel_device не нужен для dual encoder,
      // FFmpeg автоматически распределяет нагрузку
    }

    args.push('-i', inputPath)

    // Видео фильтры
    if (task.anime4kFilter) {
      // Anime4K уже включает деинтерлейс если нужно
      args.push('-vf', task.anime4kFilter)
    } else {
      // Авто-деинтерлейс и опциональный денойз для обычного транскода
      const fo = task.sourceFieldOrder
      const vfParts: string[] = []

      if (fo === 'tt' || fo === 'bb') {
        // mode=0: один кадр на входной, сохраняет исходный fps (29.97 для 1080i)
        const parity = fo === 'tt' ? 'tff' : 'bff'
        vfParts.push(`yadif=mode=0:parity=${parity}`)
      }

      if (options.denoiseEnabled) {
        vfParts.push('hqdn3d=4:3:6:4.5')
      }

      if (vfParts.length > 0) {
        args.push('-vf', vfParts.join(','))
      }
    }

    if (useCpu) {
      // === CPU кодирование (libsvtav1) ===
      this.buildSvtAv1Args(args, task)
    } else {
      // === GPU кодирование (NVENC) ===
      this.buildNvencArgs(args, task, codec)
    }

    // Без аудио (аудио обрабатывается отдельно в AudioPool)
    args.push('-an')

    // Выходной файл
    args.push(outputPath)

    return args
  }

  /**
   * Построить аргументы для libsvtav1 (CPU кодирование)
   * Best practices 2025 для аниме
   */
  private buildSvtAv1Args(args: string[], task: VideoPoolTask): void {
    const { options } = task

    // Маппинг NVENC preset → libsvtav1 preset
    // NVENC: p1-p7 (p7 = качество), libsvtav1: 0-13 (0 = качество)
    const NVENC_TO_SVT_PRESET: Record<string, number> = {
      p7: 3, // Blackwell UHQ → высокое качество
      p6: 4,
      p5: 4,
      p4: 6,
      p3: 6,
      p2: 8,
      p1: 8,
    }

    const svtPreset = NVENC_TO_SVT_PRESET[options.preset] ?? 4

    // SVT-AV1 параметры для аниме (best practices 2025)
    const SVT_AV1_PARAMS = [
      'tune=0', // VQ/psychovisual — лучше для аниме
      'film-grain=4', // Для аниме (8 для live-action)
      'film-grain-denoise=0', // Отключить деноизинг — сохраняет детали
      'enable-overlays=1', // Улучшает качество
      'scd=1', // Scene change detection
      'enable-tf=0', // Отключить temporal filtering — резкость линий
      'enable-qm=1', // Quantization matrices — лучше сжатие
    ].join(':')

    args.push('-c:v', 'libsvtav1')
    args.push('-crf', options.cq.toString()) // CRF из VMAF!
    args.push('-preset', svtPreset.toString())
    args.push('-g', '240') // GOP size
    args.push('-svtav1-params', SVT_AV1_PARAMS)
    args.push('-pix_fmt', 'yuv420p10le') // 10-bit обязательно
  }

  /**
   * Построить аргументы для NVENC (GPU кодирование)
   */
  private buildNvencArgs(args: string[], task: VideoPoolTask, codec: string): void {
    const { options } = task

    // NVIDIA NVENC кодеки
    const nvencCodecs: Record<string, string> = {
      av1: 'av1_nvenc',
      hevc: 'hevc_nvenc',
      h264: 'h264_nvenc',
    }

    args.push('-c:v', nvencCodecs[codec])

    // Rate control и качество
    // ВАЖНО: -cq работает только с VBR, для constqp нужен -qp!
    const rateControl = options.rateControl ?? 'CONSTQP'
    if (rateControl === 'VBR') {
      args.push('-rc', 'vbr')
      args.push('-cq', options.cq.toString())
      if (options.maxBitrate) {
        args.push('-maxrate', `${options.maxBitrate}M`)
        args.push('-bufsize', `${options.maxBitrate * 2}M`)
      }
    } else {
      args.push('-rc', 'constqp')
      args.push('-qp', options.cq.toString()) // -qp для constqp, не -cq!
    }

    // Preset
    args.push('-preset', options.preset)

    // Tune (hq, uhq, ll, ull)
    const tune = options.tune ?? 'HQ'
    if (tune !== 'NONE') {
      args.push('-tune', tune.toLowerCase())
    }

    // Multipass
    const multipass = options.multipass ?? 'DISABLED'
    if (multipass === 'QRES') {
      args.push('-multipass', 'qres')
    } else if (multipass === 'FULLRES') {
      args.push('-multipass', 'fullres')
    }

    // GOP Size
    const gopSize = options.gopSize ?? 240
    args.push('-g', gopSize.toString())

    // Adaptive Quantization
    const spatialAq = options.spatialAq ?? true
    const temporalAq = options.temporalAq ?? true
    const aqStrength = options.aqStrength ?? 8
    args.push('-spatial-aq', spatialAq ? '1' : '0')
    args.push('-temporal-aq', temporalAq ? '1' : '0')
    args.push('-aq-strength', aqStrength.toString())

    // Lookahead (если указан)
    if (options.lookahead && options.lookahead > 0) {
      args.push('-rc-lookahead', options.lookahead.toString())
      if (options.lookaheadLevel && options.lookaheadLevel > 0) {
        args.push('-lookahead_level', options.lookaheadLevel.toString())
      }
    }

    // B-Ref Mode
    const bRefMode = options.bRefMode ?? 'DISABLED'
    if (bRefMode === 'EACH') {
      args.push('-b_ref_mode', 'each')
    } else if (bRefMode === 'MIDDLE') {
      args.push('-b_ref_mode', 'middle')
    }

    // 10-bit вывод
    if (options.force10Bit) {
      args.push('-pix_fmt', 'p010le')
    }

    // Temporal Filter (Blackwell+ / требует новую версию FFmpeg 7.1+)
    // ОТКЛЮЧЕНО: вызывает "Invalid temporal filtering level" на старых версиях
    // if (options.temporalFilter) {
    //   args.push('-tf_level', '1')
    // }
  }
}
