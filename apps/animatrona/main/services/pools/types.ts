/**
 * Типы для базового пула транскодирования
 *
 * BasePoolTask — общий интерфейс для задач
 * RunningTask — информация о запущенной задаче
 * PoolStatus — статус пула
 */

import type { ChildProcess } from 'child_process'
import type { TranscodeProgressExtended } from '../../../shared/types'
import type { PoolTaskStatus } from '../../../shared/types/parallel-transcode'

/**
 * Базовый интерфейс задачи пула
 * Audio и Video задачи расширяют этот интерфейс
 */
export interface BasePoolTask {
  /** Уникальный ID задачи */
  id: string
  /** ID элемента импорта (эпизод) */
  queueItemId: string
  /** ID эпизода в БД */
  episodeId: string
  /** Путь к входному файлу */
  inputPath: string
  /** Путь к выходному файлу */
  outputPath: string
  /** Статус задачи */
  status: PoolTaskStatus
  /** Прогресс кодирования */
  progress: TranscodeProgressExtended | null
  /** Сообщение об ошибке */
  error?: string
}

/**
 * Информация о запущенной задаче
 */
export interface RunningTask<TTask extends BasePoolTask> {
  /** Задача */
  task: TTask
  /** Процесс FFmpeg (null до spawn) */
  process: ChildProcess | null
  /** Время начала */
  startTime: number
  /** Флаг отмены — проверяется в runTask() после async операций */
  aborted: boolean
}

/**
 * Статус пула
 */
export interface PoolStatus<TTask extends BasePoolTask> {
  /** Количество запущенных задач */
  running: number
  /** Количество задач в очереди */
  queued: number
  /** Все задачи (завершённые + запущенные + в очереди) */
  tasks: TTask[]
  /** Максимальное количество параллельных задач */
  maxConcurrent: number
}

/**
 * Прогресс эпизода
 */
export interface EpisodeProgress<TTask extends BasePoolTask> {
  /** Количество завершённых задач */
  completed: number
  /** Общее количество задач */
  total: number
  /** Задачи эпизода */
  tasks: TTask[]
}
