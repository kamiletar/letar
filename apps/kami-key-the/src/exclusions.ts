/**
 * Режим исключений — пропуск SendInput для указанных приложений
 *
 * Когда активное окно принадлежит исключённому процессу,
 * хоткеи перехватываются, но Unicode символы не отправляются.
 * Это предотвращает нежелательные символы в приложениях с собственными AltGr-маппингами.
 *
 * Процесс определяется через GetForegroundWindow → GetWindowThreadProcessId →
 * OpenProcess → K32GetProcessImageFileNameW.
 * Результат кешируется — повторный поиск происходит только при смене foreground окна.
 */

import koffi from 'koffi'
import type { AppProfile } from './types.js'

// --- Win32 функции ---

const user32 = koffi.load('user32.dll')
const kernel32 = koffi.load('kernel32.dll')

const GetForegroundWindow = user32.func('void* GetForegroundWindow()')
const GetWindowThreadProcessId = user32.func('uint32 GetWindowThreadProcessId(void*, _Out_ uint32*)')
const OpenProcess = kernel32.func('void* OpenProcess(uint32, bool, uint32)')
const CloseHandle = kernel32.func('bool CloseHandle(void*)')
const K32GetProcessImageFileNameW = kernel32.func('uint32 K32GetProcessImageFileNameW(void*, uint16*, uint32)')

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000

// --- Состояние ---

/** Список исключённых процессов (lowercase, без пути) */
let excludedProcesses: string[] = []

/** Per-app профили (lowercase ключи) */
let appProfiles: AppProfile[] = []

/** Кэш: значение foreground HWND при последней проверке */
let lastHwndValue = 0
/** Кэш: результат последней проверки */
let lastExcluded = false
/** Кэш: имя процесса последнего foreground окна */
let lastProcessName = ''

// --- Внутренние функции ---

/** Получить имя процесса (filename) по PID */
function getProcessNameByPid(pid: number): string {
  const hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
  if (!hProcess) {
    return ''
  }

  try {
    const nameBuf = new Uint16Array(260)
    const len = K32GetProcessImageFileNameW(hProcess, nameBuf, 260)
    if (len === 0) {
      return ''
    }

    // Конвертируем UTF-16 в строку
    const fullPath = String.fromCharCode(...nameBuf.subarray(0, len))
    // Извлекаем только имя файла (после последнего \)
    const lastSlash = fullPath.lastIndexOf('\\')
    return fullPath.slice(lastSlash + 1).toLowerCase()
  } finally {
    CloseHandle(hProcess)
  }
}

// --- Публичные функции ---

/**
 * Получить имя процесса текущего foreground-окна.
 * Возвращает lowercase имя файла (например "notepad.exe") или пустую строку.
 */
export function getForegroundProcessName(): string {
  const hwnd = GetForegroundWindow()
  const hwndValue = Number(hwnd) || 0
  if (hwndValue === 0) {
    return ''
  }

  const pidBuf = [0]
  GetWindowThreadProcessId(hwnd, pidBuf)
  const pid = pidBuf[0]
  if (!pid) {
    return ''
  }

  return getProcessNameByPid(pid)
}

/**
 * Проверить, находится ли текущее foreground окно в списке исключений.
 * Результат кешируется — повторный поиск при смене foreground окна.
 */
export function isCurrentWindowExcluded(): boolean {
  if (excludedProcesses.length === 0) {
    return false
  }

  const hwnd = GetForegroundWindow()
  const hwndValue = Number(hwnd) || 0

  // Кэш: тот же foreground → тот же результат
  if (hwndValue === lastHwndValue && hwndValue !== 0) {
    return lastExcluded
  }

  lastHwndValue = hwndValue

  if (hwndValue === 0) {
    lastExcluded = false
    return false
  }

  // Получить PID из HWND
  const pidBuf = [0]
  GetWindowThreadProcessId(hwnd, pidBuf)
  const pid = pidBuf[0]

  if (!pid) {
    lastExcluded = false
    return false
  }

  // Получить имя процесса и проверить в списке
  const processName = getProcessNameByPid(pid)
  lastProcessName = processName
  lastExcluded = processName !== '' && excludedProcesses.includes(processName)

  if (lastExcluded) {
    console.log(`Исключение: ${processName} — хоткеи пропущены`)
  }

  return lastExcluded
}

/** Установить список исключённых процессов */
export function setExcludedProcesses(processes: string[]): void {
  excludedProcesses = processes.map((p) => p.toLowerCase())
  lastHwndValue = 0 // Сбросить кэш
}

/** Получить текущий список исключений */
export function getExcludedProcesses(): string[] {
  return [...excludedProcesses]
}

/** Установить per-app профили */
export function setAppProfiles(profiles: AppProfile[]): void {
  appProfiles = profiles.map((p) => ({ ...p, process: p.process.toLowerCase() }))
  lastHwndValue = 0 // Сбросить кэш
}

/**
 * Найти AppProfile для текущего foreground-окна.
 * Возвращает имя раскладки или undefined (= использовать текущую).
 * Вызывать ПОСЛЕ isCurrentWindowExcluded() — использует кэшированное имя процесса.
 */
export function getAppProfileLayout(): string | undefined {
  if (appProfiles.length === 0 || !lastProcessName) {
    return undefined
  }

  const profile = appProfiles.find((p) => p.process === lastProcessName)
  return profile?.layout
}
