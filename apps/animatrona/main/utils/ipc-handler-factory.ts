/**
 * IPC Handler Factory — устраняет дублирование boilerplate в IPC handlers
 *
 * Вместо:
 * ```typescript
 * ipcMain.handle('channel:action', async (_event, arg) => {
 *   try {
 *     const result = await operation(arg)
 *     return { success: true, data: result }
 *   } catch (error) {
 *     console.error('[IPC] channel:action error:', error)
 *     return { success: false, error: error.message }
 *   }
 * })
 * ```
 *
 * Используй:
 * ```typescript
 * createHandler('channel:action', async (arg) => operation(arg))
 * ```
 */

import { BrowserWindow, ipcMain } from 'electron'

/** Стандартный результат IPC операции */
export interface IpcResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/** Тип handler функции без event */
type HandlerFn<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult> | TResult

/** Тип handler функции с event */
type HandlerFnWithEvent<TArgs extends unknown[], TResult> = (
  event: Electron.IpcMainInvokeEvent,
  ...args: TArgs
) => Promise<TResult> | TResult

/**
 * Создаёт IPC handler с автоматической обработкой ошибок
 *
 * @param channel — название канала (например 'ipfs:addFile')
 * @param handler — функция-обработчик (без event)
 * @param options — опции (логирование, префикс)
 *
 * @example
 * // Простой handler без аргументов
 * createHandler('app:getVersion', () => app.getVersion())
 *
 * // Handler с аргументами
 * createHandler('ipfs:addFile', async (filePath: string) => {
 *   return await addFile(filePath)
 * })
 *
 * // Handler с несколькими аргументами
 * createHandler('ipfs:saveToFile', async (cid: string, outputPath: string) => {
 *   await saveToFile(cid, outputPath)
 * })
 */
export function createHandler<TArgs extends unknown[], TResult>(
  channel: string,
  handler: HandlerFn<TArgs, TResult>,
  options: { logErrors?: boolean; logPrefix?: string } = {},
): void {
  const { logErrors = true, logPrefix = '[IPC]' } = options

  ipcMain.handle(channel, async (_event, ...args: TArgs): Promise<IpcResult<TResult>> => {
    try {
      const result = await handler(...args)
      // Если результат undefined, возвращаем просто success
      if (result === undefined) {
        return { success: true }
      }
      return { success: true, data: result }
    } catch (error) {
      if (logErrors) {
        console.error(`${logPrefix} ${channel} error:`, error)
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
}

/**
 * Создаёт IPC handler с доступом к event (для редких случаев)
 *
 * @example
 * createHandlerWithEvent('window:focus', (event) => {
 *   const window = BrowserWindow.fromWebContents(event.sender)
 *   window?.focus()
 * })
 */
export function createHandlerWithEvent<TArgs extends unknown[], TResult>(
  channel: string,
  handler: HandlerFnWithEvent<TArgs, TResult>,
  options: { logErrors?: boolean; logPrefix?: string } = {},
): void {
  const { logErrors = true, logPrefix = '[IPC]' } = options

  ipcMain.handle(channel, async (event, ...args: TArgs): Promise<IpcResult<TResult>> => {
    try {
      const result = await handler(event, ...args)
      if (result === undefined) {
        return { success: true }
      }
      return { success: true, data: result }
    } catch (error) {
      if (logErrors) {
        console.error(`${logPrefix} ${channel} error:`, error)
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
}

/**
 * Создаёт несколько handlers с общим префиксом
 *
 * @example
 * createHandlers('ipfs', {
 *   status: () => kuboService.getStatus(),
 *   start: () => kuboService.initialize(),
 *   stop: () => kuboService.shutdown(),
 *   addFile: (filePath: string) => addFile(filePath),
 * })
 * // Создаёт: ipfs:status, ipfs:start, ipfs:stop, ipfs:addFile
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic утилитный тип для IPC handlers
export function createHandlers<T extends Record<string, HandlerFn<any[], any>>>(
  prefix: string,
  handlers: T,
  options: { logErrors?: boolean; logPrefix?: string } = {},
): void {
  for (const [name, handler] of Object.entries(handlers)) {
    createHandler(`${prefix}:${name}`, handler, options)
  }
}

/**
 * Утилита для отправки событий во все окна
 *
 * @example
 * broadcastToWindows('ipfs:statusChanged', status)
 */
export function broadcastToWindows(channel: string, ...args: unknown[]): void {
  const windows = BrowserWindow.getAllWindows()
  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, ...args)
    }
  }
}

/**
 * Создаёт event listener с автоматической трансляцией в renderer
 *
 * @example
 * // Вместо:
 * service.on('statusChanged', (status) => {
 *   const windows = BrowserWindow.getAllWindows()
 *   for (const window of windows) {
 *     window.webContents.send('ipfs:statusChanged', status)
 *   }
 * })
 *
 * // Используй:
 * forwardEvent(service, 'statusChanged', 'ipfs:statusChanged')
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic EventEmitter callback type
export function forwardEvent<T extends { on: (event: string, listener: (...args: any[]) => void) => void }>(
  emitter: T,
  eventName: string,
  channel: string,
): void {
  emitter.on(eventName, (...args: unknown[]) => {
    broadcastToWindows(channel, ...args)
  })
}

/**
 * Создаёт несколько event forwarders с общим префиксом
 *
 * @example
 * forwardEvents(kuboService, 'ipfs', {
 *   'status:changed': 'statusChanged',
 *   'peer:connected': 'peerConnected',
 *   'peer:disconnected': 'peerDisconnected',
 *   'error': 'error',
 * })
 * // Форвардит в: ipfs:statusChanged, ipfs:peerConnected, ipfs:peerDisconnected, ipfs:error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic EventEmitter callback type
export function forwardEvents<T extends { on: (event: string, listener: (...args: any[]) => void) => void }>(
  emitter: T,
  prefix: string,
  eventMap: Record<string, string>,
): void {
  for (const [eventName, channelSuffix] of Object.entries(eventMap)) {
    forwardEvent(emitter, eventName, `${prefix}:${channelSuffix}`)
  }
}

// === THROTTLED BROADCASTER ===

/**
 * Создаёт throttled broadcaster для батчирования частых событий
 *
 * Полезно для progress событий, которые могут приходить сотни раз в секунду.
 * Буферизует последнее значение для каждого ID и отправляет пачкой.
 *
 * @param channel — канал для отправки (например 'transcode:progress')
 * @param intervalMs — интервал между отправками (по умолчанию 100мс)
 *
 * @example
 * const broadcastProgress = createThrottledBroadcaster<TranscodeProgress>('transcode:progress', 100)
 *
 * // Вместо прямого broadcastToWindows:
 * service.on('progress', (id, progress) => broadcastProgress(id, progress))
 */
export function createThrottledBroadcaster<T>(channel: string, intervalMs = 100): (id: string, data: T) => void {
  const buffer = new Map<string, T>()
  let timer: ReturnType<typeof setTimeout> | null = null

  return (id: string, data: T) => {
    buffer.set(id, data)

    if (timer) {
      return
    }

    timer = setTimeout(() => {
      for (const [bufferedId, bufferedData] of buffer) {
        broadcastToWindows(channel, bufferedId, bufferedData)
      }
      buffer.clear()
      timer = null
    }, intervalMs)
  }
}

// === QUEUE HANDLERS FACTORY ===

/**
 * Интерфейс для сервиса очереди
 * Все методы опциональные — фабрика создаст handlers только для реализованных
 */
export interface QueueServiceInterface<TAddData = unknown, TTask = unknown> {
  /** Добавить задачу */
  addTask?(data: TAddData): Promise<TTask> | TTask
  /** Отменить задачу */
  cancelTask?(id: string): Promise<void> | void
  /** Приостановить задачу */
  pauseTask?(id: string): Promise<void> | void
  /** Возобновить задачу */
  resumeTask?(id: string): Promise<void> | void
  /** Повторить задачу */
  retryTask?(id: string): Promise<void> | void
  /** Получить задачу по ID */
  getTask?(id: string): TTask | undefined
  /** Получить список задач */
  listTasks?(): TTask[] | Promise<TTask[]>
  /** Очистить завершённые */
  clearCompleted?(): void
}

/**
 * Создаёт стандартные IPC handlers для очереди задач
 *
 * @param prefix — префикс канала (например 'export-queue')
 * @param service — сервис очереди с реализованными методами
 *
 * @example
 * const service = ExportQueueService.getInstance()
 * createQueueHandlers('export-queue', {
 *   addTask: (data) => service.addTask(data),
 *   cancelTask: (id) => service.cancelTask(id),
 *   pauseTask: (id) => service.pauseTask(id),
 *   resumeTask: (id) => service.resumeTask(id),
 *   retryTask: (id) => service.retryTask(id),
 *   listTasks: () => service.listTasks(),
 *   getTask: (id) => service.getTask(id),
 *   clearCompleted: () => service.clearCompleted(),
 * })
 * // Создаст: export-queue:add, export-queue:cancel, export-queue:pause, ...
 */
export function createQueueHandlers<TAddData = unknown, TTask = unknown>(
  prefix: string,
  service: QueueServiceInterface<TAddData, TTask>,
): void {
  if (service.addTask) {
    createHandler(`${prefix}:add`, (data: TAddData) => service.addTask!(data))
  }
  if (service.cancelTask) {
    createHandler(`${prefix}:cancel`, (id: string) => service.cancelTask!(id))
  }
  if (service.pauseTask) {
    createHandler(`${prefix}:pause`, (id: string) => service.pauseTask!(id))
  }
  if (service.resumeTask) {
    createHandler(`${prefix}:resume`, (id: string) => service.resumeTask!(id))
  }
  if (service.retryTask) {
    createHandler(`${prefix}:retry`, (id: string) => service.retryTask!(id))
  }
  if (service.listTasks) {
    createHandler(`${prefix}:list`, () => service.listTasks!())
  }
  if (service.getTask) {
    createHandler(`${prefix}:get`, (id: string) => {
      const task = service.getTask!(id)
      if (!task) {
        throw new Error('Task not found')
      }
      return task
    })
  }
  if (service.clearCompleted) {
    createHandler(`${prefix}:clear`, () => service.clearCompleted!())
  }
}
