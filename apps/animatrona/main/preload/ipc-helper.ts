/**
 * IPC Helper — утилиты для работы с ipcRenderer в preload
 *
 * Сокращает boilerplate при создании методов API:
 * - invoke() — простой вызов ipcRenderer.invoke
 * - on() — подписка на события с auto-cleanup
 */

import { ipcRenderer, type IpcRendererEvent } from 'electron'

/**
 * Создаёт invoke-метод для IPC канала
 *
 * @example
 * const getVersion = invoke<[], string>('app:getVersion')
 * // Использование: getVersion() → Promise<string>
 *
 * @example
 * const probe = invoke<[string], MediaInfo>('ffmpeg:probe')
 * // Использование: probe(filePath) → Promise<MediaInfo>
 */
export function invoke<TArgs extends unknown[], TResult>(channel: string): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => ipcRenderer.invoke(channel, ...args)
}

/**
 * Создаёт on-метод для IPC события с auto-cleanup
 *
 * @example
 * const onProgress = on<[TranscodeProgress]>('ffmpeg:progress')
 * // Использование: const unsub = onProgress((progress) => { ... })
 *
 * @returns Функция подписки, которая возвращает функцию отписки
 */
export function on<TArgs extends unknown[]>(channel: string): (callback: (...args: TArgs) => void) => () => void {
  return (callback: (...args: TArgs) => void) => {
    const handler = (_event: IpcRendererEvent, ...args: TArgs) => callback(...args)
    ipcRenderer.on(channel, handler as (...args: unknown[]) => void)
    return () => ipcRenderer.removeListener(channel, handler as (...args: unknown[]) => void)
  }
}

/**
 * Создаёт invoke-метод с возвращаемым типом { success, data?, error? }
 */
export function invokeResult<TArgs extends unknown[], TData>(
  channel: string
): (...args: TArgs) => Promise<{ success: boolean; data?: TData; error?: string }> {
  return invoke<TArgs, { success: boolean; data?: TData; error?: string }>(channel)
}
