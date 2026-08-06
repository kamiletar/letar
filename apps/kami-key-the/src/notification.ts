/**
 * Уведомление о смене раскладки — GDI overlay 300×60px
 *
 * Маленькое полупрозрачное окно по центру экрана с текстом.
 * Автоматически скрывается через 1000мс.
 * Не забирает фокус, не реагирует на клики.
 */

import koffi from 'koffi'
import { getCenterOnActiveMonitor } from './monitor.js'

// --- Win32 константы ---

const WS_POPUP = 0x80000000
const WS_EX_TOPMOST = 0x00000008
const WS_EX_LAYERED = 0x00080000
const WS_EX_NOACTIVATE = 0x08000000
const WS_EX_TOOLWINDOW = 0x00000080
const WS_EX_TRANSPARENT = 0x00000020

const LWA_ALPHA = 0x00000002
const SW_SHOWNOACTIVATE = 8
const SW_HIDE = 0

const WM_PAINT = 0x000f
const WM_ERASEBKGND = 0x0014

const TRANSPARENT_BK = 1
const DT_CENTER = 0x00000001
const DT_VCENTER = 0x00000004
const DT_SINGLELINE = 0x00000020
const DT_NOPREFIX = 0x00000800

const IDC_ARROW = 32512

const FW_BOLD = 700

// --- Размеры ---

const NOTIFY_WIDTH = 300
const NOTIFY_HEIGHT = 60
const NOTIFY_ALPHA = 220 // ~86% непрозрачность
const NOTIFY_DURATION = 1000 // автоскрытие через 1000мс

// Цвета (COLORREF = 0x00BBGGRR)
const COLOR_BG = 0x003b3b3b // #3B3B3B тёмный фон
const COLOR_TEXT = 0x00ffffff // #FFFFFF белый текст

// --- Win32 структуры ---

const RECT_N = koffi.struct('RECT_N', {
  left: 'int32',
  top: 'int32',
  right: 'int32',
  bottom: 'int32',
})

const _PAINTSTRUCT_N = koffi.struct('PAINTSTRUCT_N', {
  hdc: 'void*',
  fErase: 'int32',
  rcPaint: RECT_N,
  fRestore: 'int32',
  fIncUpdate: 'int32',
  rgbReserved: koffi.array('uint8', 32),
})

const WNDCLASSEX_N = koffi.struct('WNDCLASSEX_N', {
  cbSize: 'uint32',
  style: 'uint32',
  lpfnWndProc: 'void*',
  cbClsExtra: 'int32',
  cbWndExtra: 'int32',
  hInstance: 'void*',
  hIcon: 'void*',
  hCursor: 'void*',
  hbrBackground: 'void*',
  lpszMenuName: 'void*',
  lpszClassName: 'const char16_t*',
  hIconSm: 'void*',
})

// --- Win32 функции ---

const user32 = koffi.load('user32.dll')
const gdi32 = koffi.load('gdi32.dll')
const kernel32 = koffi.load('kernel32.dll')

const WNDPROC_N = koffi.proto('intptr_t __stdcall WNDPROC_N(void*, uint32, uintptr_t, intptr_t)')

const RegisterClassExW = user32.func('uint16 RegisterClassExW(WNDCLASSEX_N*)')
const CreateWindowExW = user32.func(
  'void* CreateWindowExW(uint32, const char16_t*, const char16_t*, uint32, int, int, int, int, void*, void*, void*, void*)',
)
const ShowWindow = user32.func('bool ShowWindow(void*, int)')
const DestroyWindow = user32.func('bool DestroyWindow(void*)')
const DefWindowProcW = user32.func('intptr_t DefWindowProcW(void*, uint32, uintptr_t, intptr_t)')
const SetLayeredWindowAttributes = user32.func('bool SetLayeredWindowAttributes(void*, uint32, uint8, uint32)')
const LoadCursorW = user32.func('void* LoadCursorW(void*, intptr_t)')
const SetWindowPos = user32.func('bool SetWindowPos(void*, void*, int, int, int, int, uint32)')

const SWP_NOSIZE = 0x0001
const SWP_NOZORDER = 0x0004
const BeginPaint = user32.func('void* BeginPaint(void*, _Out_ PAINTSTRUCT_N*)')
const EndPaint = user32.func('bool EndPaint(void*, PAINTSTRUCT_N*)')
const FillRect = user32.func('int FillRect(void*, RECT_N*, void*)')
const DrawTextW = user32.func('int DrawTextW(void*, const char16_t*, int, RECT_N*, uint32)')
const InvalidateRect = user32.func('bool InvalidateRect(void*, RECT_N*, int32)')
const UpdateWindow = user32.func('bool UpdateWindow(void*)')

const CreateSolidBrush = gdi32.func('void* CreateSolidBrush(uint32)')
const CreateFontW = gdi32.func(
  'void* CreateFontW(int, int, int, int, int, uint32, uint32, uint32, uint32, uint32, uint32, uint32, uint32, const char16_t*)',
)
const SelectObject = gdi32.func('void* SelectObject(void*, void*)')
const SetBkMode = gdi32.func('int SetBkMode(void*, int)')
const SetTextColor = gdi32.func('uint32 SetTextColor(void*, uint32)')
const DeleteObject = gdi32.func('bool DeleteObject(void*)')

const GetModuleHandleW = kernel32.func('void* GetModuleHandleW(const char16_t*)')

// --- Состояние ---

let notifyHwnd: unknown = null
let bgBrush: unknown = null
let textFont: unknown = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let currentText = ''

// Переиспользуемый RECT
const tmpRect = { left: 0, top: 0, right: 0, bottom: 0 }

// --- Отрисовка ---

function paintNotification(hwnd: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ps: any = {}
  const hdc = BeginPaint(hwnd, ps)
  if (!hdc) {
    return
  }

  // Фон
  tmpRect.left = 0
  tmpRect.top = 0
  tmpRect.right = NOTIFY_WIDTH
  tmpRect.bottom = NOTIFY_HEIGHT
  FillRect(hdc, tmpRect, bgBrush)

  // Текст по центру
  SetBkMode(hdc, TRANSPARENT_BK)
  SetTextColor(hdc, COLOR_TEXT)
  SelectObject(hdc, textFont)
  DrawTextW(hdc, currentText, -1, tmpRect, DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX)

  EndPaint(hwnd, ps)
}

function notifyWndProc(hwnd: unknown, msg: number, _wParam: unknown, _lParam: unknown): number | bigint {
  if (msg === WM_PAINT) {
    paintNotification(hwnd)
    return 0
  }
  if (msg === WM_ERASEBKGND) {
    return 1
  }
  return DefWindowProcW(hwnd, msg, _wParam, _lParam)
}

const wndProcCb = koffi.register(notifyWndProc, koffi.pointer(WNDPROC_N))

// --- Публичные функции ---

/** Создать окно уведомления (скрытое) */
export function initNotification(): boolean {
  try {
    bgBrush = CreateSolidBrush(COLOR_BG)
    textFont = CreateFontW(-18, 0, 0, 0, FW_BOLD, 0, 0, 0, 1, 0, 0, 5, 0, 'Segoe UI')

    const hInstance = GetModuleHandleW(null)
    const hCursor = LoadCursorW(null, IDC_ARROW)

    const wc = {
      cbSize: koffi.sizeof(WNDCLASSEX_N),
      style: 0,
      lpfnWndProc: wndProcCb,
      cbClsExtra: 0,
      cbWndExtra: 0,
      hInstance,
      hIcon: null,
      hCursor,
      hbrBackground: null,
      lpszMenuName: null,
      lpszClassName: 'KamiKeyTheNotify',
      hIconSm: null,
    }

    const atom = RegisterClassExW(wc)
    if (!atom) {
      console.warn('Notification: не удалось зарегистрировать класс окна')
      return false
    }

    // Центрирование на активном мониторе
    const pos = getCenterOnActiveMonitor(NOTIFY_WIDTH, NOTIFY_HEIGHT)
    const x = pos.x
    const y = pos.y

    const exStyle = WS_EX_TOPMOST | WS_EX_LAYERED | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TRANSPARENT

    notifyHwnd = CreateWindowExW(
      exStyle,
      'KamiKeyTheNotify',
      '',
      WS_POPUP,
      x,
      y,
      NOTIFY_WIDTH,
      NOTIFY_HEIGHT,
      null,
      null,
      hInstance,
      null,
    )

    if (!notifyHwnd) {
      console.warn('Notification: не удалось создать окно')
      return false
    }

    SetLayeredWindowAttributes(notifyHwnd, 0, NOTIFY_ALPHA, LWA_ALPHA)
    console.log('Уведомления инициализированы')
    return true
  } catch (err) {
    console.warn('Notification: ошибка инициализации:', err)
    return false
  }
}

/** Показать уведомление с текстом, автоскрытие через NOTIFY_DURATION мс */
export function showNotification(text: string): void {
  if (!notifyHwnd) {
    return
  }

  currentText = text

  // Сбросить предыдущий таймер
  if (hideTimer) {
    clearTimeout(hideTimer)
  }

  // Переместить на монитор с активным окном
  const pos = getCenterOnActiveMonitor(NOTIFY_WIDTH, NOTIFY_HEIGHT)
  SetWindowPos(notifyHwnd, null, pos.x, pos.y, 0, 0, SWP_NOSIZE | SWP_NOZORDER)

  ShowWindow(notifyHwnd, SW_SHOWNOACTIVATE)
  InvalidateRect(notifyHwnd, null, 1)
  UpdateWindow(notifyHwnd)

  hideTimer = setTimeout(() => {
    ShowWindow(notifyHwnd, SW_HIDE)
    hideTimer = null
  }, NOTIFY_DURATION)
}

/** Уничтожить окно уведомления и освободить GDI объекты */
export function destroyNotification(): void {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  if (notifyHwnd) {
    DestroyWindow(notifyHwnd)
    notifyHwnd = null
  }

  if (bgBrush) {
    DeleteObject(bgBrush)
    bgBrush = null
  }
  if (textFont) {
    DeleteObject(textFont)
    textFont = null
  }
}
