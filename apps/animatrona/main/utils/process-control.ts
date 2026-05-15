/**
 * Контроль процессов — пауза/возобновление
 *
 * Кросс-платформенное решение:
 * - Unix/macOS: SIGSTOP/SIGCONT
 * - Windows: ntsuspend (NtSuspendProcess/NtResumeProcess)
 */

import { type ChildProcess, execSync } from 'child_process'
import { app } from 'electron'
import path from 'path'

import { createModuleLogger } from './logger'

const log = createModuleLogger('ProcessControl')

// ntsuspend работает только на Windows
// На других платформах используем SIGSTOP/SIGCONT
type NtsuspendModule = { suspend: (pid: number) => boolean; resume: (pid: number) => boolean }
let ntsuspend: NtsuspendModule | null = null
let ntsuspendInitialized = false

/**
 * Ленивая загрузка ntsuspend
 * Вызывается при первом использовании, когда app уже готов
 */
function getNtsuspend(): NtsuspendModule | null {
  if (ntsuspendInitialized) {
    return ntsuspend
  }
  ntsuspendInitialized = true

  if (process.platform !== 'win32') {
    return null
  }

  try {
    // В production модуль находится в resources/node_modules/ntsuspend
    // В dev — в обычном node_modules
    const isDev = !app.isPackaged
    if (isDev) {
      ntsuspend = require('ntsuspend')
    } else {
      const resourcesPath = process.resourcesPath ?? ''
      const ntsuspendPath = path.join(resourcesPath, 'node_modules', 'ntsuspend')

      ntsuspend = require(ntsuspendPath)
    }
    log.info('ntsuspend загружен успешно')
    return ntsuspend
  } catch (error) {
    log.warn('ntsuspend не загружен — пауза процессов недоступна', { error })
    return null
  }
}

/**
 * Приостанавливает процесс по PID
 *
 * @param pid - ID процесса
 * @returns true если успешно, false при ошибке
 */
export function suspendProcess(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      // Windows: ntsuspend (NtSuspendProcess)
      const nt = getNtsuspend()
      if (!nt) {
        log.warn('ntsuspend недоступен')
        return false
      }
      const result = nt.suspend(pid)
      if (!result) {
        log.warn(`ntsuspend.suspend(${pid}) вернул false`)
      } else {
        log.info(`Процесс ${pid} приостановлен`)
      }
      return result
    } else {
      // Unix/macOS: SIGSTOP
      process.kill(pid, 'SIGSTOP')
      return true
    }
  } catch (error) {
    log.error(`Ошибка приостановки процесса ${pid}`, { error })
    return false
  }
}

/**
 * Возобновляет процесс по PID
 *
 * @param pid - ID процесса
 * @returns true если успешно, false при ошибке
 */
export function resumeProcess(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      // Windows: ntsuspend (NtResumeProcess)
      const nt = getNtsuspend()
      if (!nt) {
        log.warn('ntsuspend недоступен')
        return false
      }
      const result = nt.resume(pid)
      if (!result) {
        log.warn(`ntsuspend.resume(${pid}) вернул false — процесс мог завершиться`)
      } else {
        log.info(`Процесс ${pid} возобновлён`)
      }
      return result
    } else {
      // Unix/macOS: SIGCONT
      process.kill(pid, 'SIGCONT')
      return true
    }
  } catch (error) {
    log.error(`Ошибка возобновления процесса ${pid}`, { error })
    return false
  }
}

/**
 * Приостанавливает ChildProcess и все дочерние процессы
 *
 * @param childProcess - Объект ChildProcess
 * @returns true если успешно
 */
export function suspendChildProcess(childProcess: ChildProcess): boolean {
  if (!childProcess.pid) {
    return false
  }

  // Приостанавливаем основной процесс
  const mainSuspended = suspendProcess(childProcess.pid)

  // На Windows FFmpeg может создавать дочерние процессы
  // Они обычно наследуют состояние родителя при использовании pssuspend
  // Но на Unix нужно приостановить группу процессов
  if (process.platform !== 'win32' && mainSuspended) {
    try {
      // Приостановить всю группу процессов (отрицательный PID)
      process.kill(-childProcess.pid, 'SIGSTOP')
    } catch {
      // Игнорируем ошибку если группа не существует
    }
  }

  return mainSuspended
}

/**
 * Возобновляет ChildProcess и все дочерние процессы
 *
 * @param childProcess - Объект ChildProcess
 * @returns true если успешно
 */
export function resumeChildProcess(childProcess: ChildProcess): boolean {
  if (!childProcess.pid) {
    return false
  }

  // На Unix сначала возобновляем группу
  if (process.platform !== 'win32') {
    try {
      process.kill(-childProcess.pid, 'SIGCONT')
    } catch {
      // Игнорируем ошибку
    }
  }

  return resumeProcess(childProcess.pid)
}

/**
 * Проверяет доступность ntsuspend на Windows
 *
 * @returns true если ntsuspend загружен
 */
export function isNtsuspendAvailable(): boolean {
  if (process.platform !== 'win32') {
    return true // На Unix используем встроенные сигналы
  }
  return getNtsuspend() !== null
}

/**
 * Получает информацию о доступности паузы
 */
export function getPauseCapabilities(): {
  available: boolean
  method: 'signals' | 'ntsuspend' | 'none'
  message?: string
} {
  if (process.platform === 'win32') {
    if (getNtsuspend()) {
      return {
        available: true,
        method: 'ntsuspend',
      }
    }
    return {
      available: false,
      method: 'none',
      message: 'ntsuspend не загружен — пауза процессов недоступна',
    }
  }

  // Unix/macOS всегда поддерживает
  return {
    available: true,
    method: 'signals',
  }
}

/**
 * Завершает процесс принудительно
 *
 * @param pid - ID процесса
 * @param force - Принудительное завершение (SIGKILL)
 * @returns true если успешно
 */
export function terminateProcess(pid: number, force = false): boolean {
  try {
    if (process.platform === 'win32') {
      // Windows: taskkill
      const cmd = force ? `taskkill /F /PID ${pid}` : `taskkill /PID ${pid}`
      execSync(cmd, { stdio: 'ignore', timeout: 5000 })
    } else {
      // Unix: SIGTERM или SIGKILL
      process.kill(pid, force ? 'SIGKILL' : 'SIGTERM')
    }
    return true
  } catch (error) {
    log.error(`Ошибка завершения процесса ${pid}`, { error })
    return false
  }
}

/**
 * Завершает ChildProcess и все дочерние процессы
 *
 * @param childProcess - Объект ChildProcess
 * @param force - Принудительное завершение
 * @returns true если успешно
 */
export function terminateChildProcess(childProcess: ChildProcess, force = false): boolean {
  if (!childProcess.pid) {
    return false
  }

  // На Windows убиваем дерево процессов
  if (process.platform === 'win32') {
    try {
      const cmd = force ? `taskkill /F /T /PID ${childProcess.pid}` : `taskkill /T /PID ${childProcess.pid}`
      execSync(cmd, { stdio: 'ignore', timeout: 5000 })
      return true
    } catch (error) {
      log.error('Ошибка завершения дерева процессов', { error })
      return false
    }
  }

  // Unix: убиваем группу процессов
  try {
    process.kill(-childProcess.pid, force ? 'SIGKILL' : 'SIGTERM')
    return true
  } catch {
    // Пробуем убить только основной процесс
    return terminateProcess(childProcess.pid, force)
  }
}
