/**
 * Мульти-мониторное позиционирование окон
 *
 * Определяет монитор с foreground-окном через Win32 API и центрирует
 * заданные размеры на этом мониторе. Fallback на primary монитор.
 */

import koffi from 'koffi'

// --- Win32 константы ---

const SM_CXSCREEN = 0
const SM_CYSCREEN = 1
const MONITOR_DEFAULTTONEAREST = 0x00000002

// --- Win32 структуры (уникальные имена — избежать коллизии с overlay/notification) ---

const RECT_M = koffi.struct('RECT_M', {
  left: 'int32',
  top: 'int32',
  right: 'int32',
  bottom: 'int32',
})

const MONITORINFO_M = koffi.struct('MONITORINFO_M', {
  cbSize: 'uint32',
  rcMonitor: RECT_M,
  rcWork: RECT_M,
  dwFlags: 'uint32',
})

// --- Win32 функции ---

const user32 = koffi.load('user32.dll')

const GetForegroundWindow = user32.func('void* GetForegroundWindow()')
const MonitorFromWindow = user32.func('void* MonitorFromWindow(void*, uint32)')
const GetMonitorInfoW = user32.func('bool GetMonitorInfoW(void*, _Inout_ MONITORINFO_M*)')
const GetSystemMetrics = user32.func('int GetSystemMetrics(int)')

// --- Публичные функции ---

/** Позиция для центрирования на экране */
export interface CenterPosition {
  x: number
  y: number
}

/**
 * Вычислить координаты для центрирования окна на мониторе с foreground-окном.
 * При ошибке — центрирует на primary мониторе.
 */
export function getCenterOnActiveMonitor(width: number, height: number): CenterPosition {
  try {
    const hwnd = GetForegroundWindow()
    if (!hwnd) {
      return fallbackCenter(width, height)
    }

    const hMonitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST)
    if (!hMonitor) {
      return fallbackCenter(width, height)
    }

    const info = {
      cbSize: koffi.sizeof(MONITORINFO_M),
      rcMonitor: { left: 0, top: 0, right: 0, bottom: 0 },
      rcWork: { left: 0, top: 0, right: 0, bottom: 0 },
      dwFlags: 0,
    }

    const ok = GetMonitorInfoW(hMonitor, info)
    if (!ok) {
      return fallbackCenter(width, height)
    }

    const monW = info.rcMonitor.right - info.rcMonitor.left
    const monH = info.rcMonitor.bottom - info.rcMonitor.top
    return {
      x: info.rcMonitor.left + Math.round((monW - width) / 2),
      y: info.rcMonitor.top + Math.round((monH - height) / 2),
    }
  } catch {
    return fallbackCenter(width, height)
  }
}

/** Fallback: центрирование на primary мониторе через GetSystemMetrics */
function fallbackCenter(width: number, height: number): CenterPosition {
  const screenW = GetSystemMetrics(SM_CXSCREEN)
  const screenH = GetSystemMetrics(SM_CYSCREEN)
  return {
    x: Math.round((screenW - width) / 2),
    y: Math.round((screenH - height) / 2),
  }
}
