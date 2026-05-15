/**
 * BasePool — абстрактный базовый класс для пулов транскодирования
 *
 * Общая логика:
 * - Управление очередью задач (queue)
 * - Отслеживание запущенных задач (runningTasks)
 * - Pause/Resume/Cancel операции
 * - Статистика и прогресс
 *
 * Наследники реализуют:
 * - runTask() — запуск конкретной задачи
 * - buildFFmpegArgs() — построение аргументов FFmpeg
 */

import type { ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { createModuleLogger } from '../../utils/logger'
import { resumeChildProcess, suspendChildProcess, terminateChildProcess } from '../../utils/process-control'
import type { BasePoolTask, EpisodeProgress, PoolStatus, RunningTask } from './types'

const log = createModuleLogger('BasePool')

/**
 * Абстрактный базовый класс для пулов транскодирования
 *
 * @template TTask - Тип задачи (AudioPoolTask | VideoPoolTask)
 */
export abstract class BasePool<TTask extends BasePoolTask> extends EventEmitter {
  /** Максимальное количество параллельных задач */
  protected maxConcurrent: number

  /** Очередь ожидающих задач */
  protected queue: TTask[] = []

  /** Запущенные задачи */
  protected runningTasks: Map<string, RunningTask<TTask>> = new Map()

  /** Приостановленные задачи */
  protected pausedTasks: Set<string> = new Set()

  /** Завершённые задачи (для статистики) */
  protected completedTasks: TTask[] = []

  /** Глобальная пауза */
  protected globalPause = false

  /**
   * Счётчик задач в фазе инициализации (до spawn FFmpeg)
   * Используется для предотвращения race condition в processQueue()
   */
  protected pendingTasks = 0

  constructor(maxConcurrent: number) {
    super()
    this.maxConcurrent = maxConcurrent
  }

  // === Публичные методы ===

  /** Добавить задачу в пул */
  addTask(task: TTask): void {
    task.status = 'queued'
    task.progress = null
    this.onTaskQueued(task)
    this.queue.push(task)
    this.emit('taskQueued', task)
    this.processQueue()
  }

  /** Добавить несколько задач */
  addTasks(tasks: TTask[]): void {
    for (const task of tasks) {
      task.status = 'queued'
      task.progress = null
      this.onTaskQueued(task)
      this.queue.push(task)
      this.emit('taskQueued', task)
    }
    this.processQueue()
  }

  /** Отменить задачу */
  cancelTask(taskId: string): boolean {
    // Из очереди
    const queueIndex = this.queue.findIndex((t) => t.id === taskId)
    if (queueIndex >= 0) {
      const task = this.queue.splice(queueIndex, 1)[0]
      task.status = 'cancelled'
      task.error = 'Задача отменена пользователем'
      this.emit('taskCancelled', task)
      return true
    }

    // Из выполняющихся
    const running = this.runningTasks.get(taskId)
    if (running) {
      // Устанавливаем флаг отмены — runTask() проверит его после async операций
      running.aborted = true
      running.task.status = 'cancelled'
      running.task.error = 'Задача отменена пользователем'

      // Убиваем процесс если он уже запущен
      if (running.process) {
        terminateChildProcess(running.process, true)
      }
      // Если process === null, задача ещё в фазе probe
      // runTask() сам проверит aborted флаг и не запустит FFmpeg

      this.runningTasks.delete(taskId)
      this.pausedTasks.delete(taskId)
      this.emit('taskCancelled', running.task)
      this.processQueue()
      return true
    }

    return false
  }

  /** Отменить все задачи для эпизода */
  cancelTasksForEpisode(episodeId: string): number {
    let count = 0

    // Из очереди
    const toRemove = this.queue.filter((t) => t.episodeId === episodeId)
    for (const task of toRemove) {
      this.cancelTask(task.id)
      count++
    }

    // Из выполняющихся
    for (const [taskId, running] of this.runningTasks) {
      if (running.task.episodeId === episodeId) {
        this.cancelTask(taskId)
        count++
      }
    }

    return count
  }

  /** Приостановить задачу */
  pauseTask(taskId: string): boolean {
    const running = this.runningTasks.get(taskId)
    // process может быть null если задача ещё в фазе probe
    if (!running || !running.process) {
      return false
    }

    if (suspendChildProcess(running.process)) {
      this.pausedTasks.add(taskId)
      this.emit('taskPaused', running.task)
      return true
    }
    return false
  }

  /** Возобновить задачу */
  resumeTask(taskId: string): boolean {
    const running = this.runningTasks.get(taskId)
    if (!running || !this.pausedTasks.has(taskId)) {
      return false
    }

    if (resumeChildProcess(running.process)) {
      this.pausedTasks.delete(taskId)
      this.emit('taskResumed', running.task)
      return true
    }
    return false
  }

  /** Приостановить все задачи */
  pauseAll(): void {
    this.globalPause = true
    for (const [taskId, running] of this.runningTasks) {
      if (!this.pausedTasks.has(taskId) && running.process) {
        if (suspendChildProcess(running.process)) {
          this.pausedTasks.add(taskId)
        } else {
          log.warn('Не удалось приостановить задачу', { taskId, pid: running.process.pid })
        }
      }
    }
    this.emit('allPaused')
  }

  /** Возобновить все задачи */
  resumeAll(): void {
    this.globalPause = false
    const failedResumes: string[] = []
    for (const [taskId, running] of this.runningTasks) {
      if (this.pausedTasks.has(taskId)) {
        if (running.process) {
          const success = resumeChildProcess(running.process)
          if (!success) {
            log.warn('Не удалось возобновить процесс, принудительная перезагрузка', {
              taskId,
              pid: running.process.pid,
            })
            failedResumes.push(taskId)
          }
        } else {
          log.warn('Процесс не найден для паузированной задачи', { taskId })
        }
        this.pausedTasks.delete(taskId)
      }
    }

    // Задачи с неудавшимся resume — отменяем и перезапускаем
    for (const taskId of failedResumes) {
      const running = this.runningTasks.get(taskId)
      if (running?.process) {
        terminateChildProcess(running.process, true)
      }
      if (running) {
        running.task.status = 'error'
        running.task.error = 'Не удалось возобновить после паузы'
        this.runningTasks.delete(taskId)
        this.completedTasks.push(running.task)
        this.emit('taskError', running.task)
      }
    }

    this.emit('allResumed')
    this.processQueue()
  }

  /** Получить состояние пула */
  getStatus(): PoolStatus<TTask> {
    // Включаем все задачи: завершённые + выполняющиеся + в очереди
    const allTasks = [
      ...this.completedTasks,
      ...Array.from(this.runningTasks.values()).map((r) => r.task),
      ...this.queue,
    ]
    return {
      running: this.runningTasks.size,
      queued: this.queue.length,
      tasks: allTasks,
      maxConcurrent: this.maxConcurrent,
    }
  }

  /** Получить прогресс по эпизоду */
  getEpisodeProgress(episodeId: string): EpisodeProgress<TTask> {
    // Включаем все задачи: завершённые + выполняющиеся + в очереди
    const allTasks = [
      ...this.completedTasks,
      ...Array.from(this.runningTasks.values()).map((r) => r.task),
      ...this.queue,
    ].filter((t) => t.episodeId === episodeId)

    return {
      completed: allTasks.filter((t) => t.status === 'completed').length,
      total: allTasks.length,
      tasks: allTasks,
    }
  }

  /** Очистить очередь */
  clear(): void {
    // Отменить все запущенные (try-catch чтобы onClear() вызывался всегда)
    for (const [taskId] of this.runningTasks) {
      try {
        this.cancelTask(taskId)
      } catch (err) {
        log.warn('Ошибка при отмене задачи в clear()', { taskId, error: String(err) })
      }
    }
    // Очистить очередь, завершённые и счётчик pending
    this.queue = []
    this.completedTasks = []
    this.pendingTasks = 0
    // Хук для наследников
    this.onClear()
  }

  /** Изменить максимальное количество параллельных задач */
  setMaxConcurrent(value: number): void {
    this.maxConcurrent = this.clampMaxConcurrent(value)
    // Запускаем дополнительные задачи если лимит увеличен
    this.processQueue()
  }

  /** Получить текущий максимум параллельных задач */
  getMaxConcurrent(): number {
    return this.maxConcurrent
  }

  // === Защищённые методы (для наследников) ===

  /** Обработка очереди */
  protected processQueue(): void {
    if (this.globalPause) {
      return
    }

    // Логируем состояние очереди для диагностики
    if (this.queue.length > 0) {
      log.debug('Обработка очереди', {
        pool: this.constructor.name,
        maxConcurrent: this.maxConcurrent,
        running: this.runningTasks.size,
        pending: this.pendingTasks,
        queued: this.queue.length,
      })
    }

    // ВАЖНО: Учитываем pendingTasks для предотвращения race condition
    // pendingTasks — это задачи которые уже взяты из очереди, но ещё не завершили spawn()
    while (this.runningTasks.size + this.pendingTasks < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift()
      if (task) {
        // Увеличиваем счётчик СИНХРОННО перед вызовом async функции
        this.pendingTasks++
        this.runTask(task)
      }
    }
  }

  /**
   * Уменьшить pendingTasks и добавить задачу в runningTasks
   * Вызывается в начале runTask() после async probe
   */
  protected markTaskRunning(task: TTask, startTime: number): void {
    this.runningTasks.set(task.id, { task, process: null, startTime, aborted: false })
    this.pendingTasks--
  }

  /**
   * Обновить процесс в runningTasks после spawn
   */
  protected updateTaskProcess(taskId: string, process: ChildProcess): void {
    const running = this.runningTasks.get(taskId)
    if (running) {
      running.process = process
    }
  }

  /**
   * Завершить задачу успешно
   */
  protected completeTask(task: TTask, duration: number): void {
    this.runningTasks.delete(task.id)
    this.pausedTasks.delete(task.id)
    task.status = 'completed'
    task.progress = {
      percent: 100,
      currentTime: duration,
      totalDuration: duration,
      eta: 0,
      stage: this.getStage(),
    }
    this.completedTasks.push(task)
    this.emit('taskCompleted', task)
    this.onTaskCompleted(task)
    this.processQueue()
  }

  /**
   * Завершить задачу с ошибкой
   */
  protected failTask(task: TTask, error: string): void {
    this.runningTasks.delete(task.id)
    this.pausedTasks.delete(task.id)
    task.status = 'error'
    task.error = error
    this.completedTasks.push(task)
    this.emit('taskError', task)
    this.onTaskCompleted(task)
    this.processQueue()
  }

  /**
   * Обработать отмену задачи
   */
  protected handleTaskCancelled(task: TTask): void {
    this.runningTasks.delete(task.id)
    this.pausedTasks.delete(task.id)
    task.error = task.error || 'Задача отменена пользователем'
    this.completedTasks.push(task)
    this.emit('taskCancelled', task)
    this.processQueue()
  }

  // === Абстрактные методы (реализуются наследниками) ===

  /** Запуск задачи */
  protected abstract runTask(task: TTask): Promise<void>

  /** Получить stage для прогресса ('audio' | 'video') */
  protected abstract getStage(): 'audio' | 'video'

  // === Хуки для наследников (опциональные) ===

  /** Ограничение maxConcurrent (переопределяется в наследниках) */
  protected clampMaxConcurrent(value: number): number {
    return Math.max(1, value)
  }

  /** Хук при добавлении задачи в очередь */
  protected onTaskQueued(_task: TTask): void {
    // Переопределяется в наследниках
  }

  /** Хук при завершении задачи (успех или ошибка) */
  protected onTaskCompleted(_task: TTask): void {
    // Переопределяется в наследниках
  }

  /** Хук при очистке пула */
  protected onClear(): void {
    // Переопределяется в наследниках
  }
}
