/**
 * Визуальная клавиатура — графический overlay при удержании AltGr
 *
 * Нативное окно Win32 через Koffi:
 * - WS_EX_TOPMOST | WS_EX_LAYERED | WS_EX_NOACTIVATE — поверх всех, без фокуса
 * - WS_EX_TRANSPARENT — клик-through (мышь проходит насквозь)
 * - Физический макет ANSI клавиатуры с подсвеченными AltGr-символами
 * - Показывается при удержании AltGr > 500мс, скрывается при отпускании
 */

import koffi from 'koffi'
import { getKeymap } from './keymap.js'
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

const TRANSPARENT_BK = 1 // SetBkMode
const DT_LEFT = 0x00000000
const DT_CENTER = 0x00000001
const DT_RIGHT = 0x00000002
const DT_VCENTER = 0x00000004
const DT_SINGLELINE = 0x00000020
const DT_NOPREFIX = 0x00000800

const IDC_ARROW = 32512

const FW_NORMAL = 400
const FW_BOLD = 700
const PS_SOLID = 0

// --- Размеры overlay (позже вынесем в настройки) ---

const OVERLAY_ALPHA = 200 // 0-255, ~78% — полупрозрачность

const KEY_SIZE = 56 // px — стандартная клавиша
const KEY_GAP = 4 // px между клавишами
const KEY_RADIUS = 6 // px скругление
const UNIT = KEY_SIZE + KEY_GAP // 60px — шаг сетки

// Размер окна вычисляется из содержимого
const CONTENT_WIDTH = 15 * UNIT - KEY_GAP // 896
const CONTENT_HEIGHT = 5 * UNIT - KEY_GAP // 296
const PAD = 20 // отступ от края окна
const OVERLAY_WIDTH = CONTENT_WIDTH + PAD * 2 // 936
const OVERLAY_HEIGHT = CONTENT_HEIGHT + PAD * 2 // 336

// --- Цвета (COLORREF = 0x00BBGGRR) ---

const COLOR_BG = 0x00f5eee8 // #E8EEF5 светло-голубой фон
const COLOR_KEY = 0x00ffffff // #FFFFFF белая клавиша
const COLOR_KEY_ACTIVE = 0x00f0d4c0 // #C0D4F0 клавиша с AltGr-маппингом
const COLOR_BORDER = 0x00ccb0a0 // #A0B0CC обводка
const COLOR_TEXT = 0x00444444 // #444444 обычный текст
const COLOR_ALTGR = 0x00a83d1a // #1A3DA8 синий AltGr-символ

// --- Определение клавиш ---

interface KeyDef {
  /** Английский символ (верх-лево) */
  label: string
  /** Русский символ (низ-право) */
  ru?: string
  /** Ширина в единицах (по умолчанию 1) */
  w?: number
  /** VK код для поиска в KEYMAP */
  vk?: number
}

/** 5 рядов ANSI клавиатуры с русской раскладкой (ЙЦУКЕН) */
const KEYBOARD_ROWS: KeyDef[][] = [
  // Ряд 0: цифровой
  [
    { label: '`', ru: 'Ё', vk: 0xc0 },
    { label: '1', vk: 0x31 },
    { label: '2', vk: 0x32 },
    { label: '3', vk: 0x33 },
    { label: '4', vk: 0x34 },
    { label: '5', vk: 0x35 },
    { label: '6', vk: 0x36 },
    { label: '7', vk: 0x37 },
    { label: '8', vk: 0x38 },
    { label: '9', vk: 0x39 },
    { label: '0', vk: 0x30 },
    { label: '-', vk: 0xbd },
    { label: '=', vk: 0xbb },
    { label: 'Bksp', w: 2, vk: 0x08 },
  ],
  // Ряд 1: QWERTY / ЙЦУКЕН
  [
    { label: 'Tab', w: 1.5, vk: 0x09 },
    { label: 'Q', ru: 'Й', vk: 0x51 },
    { label: 'W', ru: 'Ц', vk: 0x57 },
    { label: 'E', ru: 'У', vk: 0x45 },
    { label: 'R', ru: 'К', vk: 0x52 },
    { label: 'T', ru: 'Е', vk: 0x54 },
    { label: 'Y', ru: 'Н', vk: 0x59 },
    { label: 'U', ru: 'Г', vk: 0x55 },
    { label: 'I', ru: 'Ш', vk: 0x49 },
    { label: 'O', ru: 'Щ', vk: 0x4f },
    { label: 'P', ru: 'З', vk: 0x50 },
    { label: '[', ru: 'Х', vk: 0xdb },
    { label: ']', ru: 'Ъ', vk: 0xdd },
    { label: '\\', w: 1.5, vk: 0xdc },
  ],
  // Ряд 2: ASDF / ФЫВАПРОЛД
  [
    { label: 'Caps', w: 1.75, vk: 0x14 },
    { label: 'A', ru: 'Ф', vk: 0x41 },
    { label: 'S', ru: 'Ы', vk: 0x53 },
    { label: 'D', ru: 'В', vk: 0x44 },
    { label: 'F', ru: 'А', vk: 0x46 },
    { label: 'G', ru: 'П', vk: 0x47 },
    { label: 'H', ru: 'Р', vk: 0x48 },
    { label: 'J', ru: 'О', vk: 0x4a },
    { label: 'K', ru: 'Л', vk: 0x4b },
    { label: 'L', ru: 'Д', vk: 0x4c },
    { label: ';', ru: 'Ж', vk: 0xba },
    { label: "'", ru: 'Э', vk: 0xde },
    { label: 'Enter', w: 2.25, vk: 0x0d },
  ],
  // Ряд 3: ZXCV / ЯЧСМИТЬ
  [
    { label: 'Shift', w: 2.25, vk: 0xa0 },
    { label: 'Z', ru: 'Я', vk: 0x5a },
    { label: 'X', ru: 'Ч', vk: 0x58 },
    { label: 'C', ru: 'С', vk: 0x43 },
    { label: 'V', ru: 'М', vk: 0x56 },
    { label: 'B', ru: 'И', vk: 0x42 },
    { label: 'N', ru: 'Т', vk: 0x4e },
    { label: 'M', ru: 'Ь', vk: 0x4d },
    { label: ',', ru: 'Б', vk: 0xbc },
    { label: '.', ru: 'Ю', vk: 0xbe },
    { label: '/', vk: 0xbf },
    { label: 'Shift', w: 2.75, vk: 0xa1 },
  ],
  // Ряд 4: модификаторы
  [
    { label: 'Ctrl', w: 1.25, vk: 0xa2 },
    { label: 'Win', w: 1.25, vk: 0x5b },
    { label: 'Alt', w: 1.25, vk: 0xa4 },
    { label: '', w: 6.25, vk: 0x20 },
    { label: 'AltGr', w: 1.25, vk: 0xa5 },
    { label: 'Win', w: 1.25, vk: 0x5c },
    { label: 'Menu', w: 1.25, vk: 0x5d },
    { label: 'Ctrl', w: 1.25, vk: 0xa3 },
  ],
]

// --- Быстрый поиск маппинга по VK коду ---

interface VkMapping {
  char: string
  shiftChar?: string
}

const vkMap = new Map<number, VkMapping>()

/** Перестроить vkMap из текущего keymap (вызывать после updateKeymap) */
export function rebuildVkMap(): void {
  vkMap.clear()
  for (const m of getKeymap()) {
    vkMap.set(m.vk, { char: m.char, shiftChar: m.shiftChar })
  }
}

/** Отображаемый AltGr-символ (спецобработка невидимых) */
function displayChar(char: string): string {
  if (char === '\u2009') {
    return '\u23B5'
  } // тонкий пробел → символ пробела ⎵
  if (char === '\u0301') {
    return '\u00B4'
  } // комбинирующий акцент → отдельный символ ´
  return char
}

// --- Win32 структуры ---

const RECT = koffi.struct('RECT', {
  left: 'int32',
  top: 'int32',
  right: 'int32',
  bottom: 'int32',
})

// Регистрация типа для BeginPaint/EndPaint (используется через строковое имя 'PAINTSTRUCT')
const _PAINTSTRUCT = koffi.struct('PAINTSTRUCT', {
  hdc: 'void*',
  fErase: 'int32',
  rcPaint: RECT,
  fRestore: 'int32',
  fIncUpdate: 'int32',
  rgbReserved: koffi.array('uint8', 32),
})

const WNDCLASSEXW = koffi.struct('WNDCLASSEXW', {
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

// Прототип оконной процедуры
const WNDPROC = koffi.proto('intptr_t __stdcall WNDPROC(void*, uint32, uintptr_t, intptr_t)')

// user32
const RegisterClassExW = user32.func('uint16 RegisterClassExW(WNDCLASSEXW*)')
const CreateWindowExW = user32.func(
  'void* CreateWindowExW(uint32, const char16_t*, const char16_t*, uint32, int, int, int, int, void*, void*, void*, void*)'
)
const ShowWindow = user32.func('bool ShowWindow(void*, int)')
const DestroyWindow = user32.func('bool DestroyWindow(void*)')
const DefWindowProcW = user32.func('intptr_t DefWindowProcW(void*, uint32, uintptr_t, intptr_t)')
const SetLayeredWindowAttributes = user32.func('bool SetLayeredWindowAttributes(void*, uint32, uint8, uint32)')
const LoadCursorW = user32.func('void* LoadCursorW(void*, intptr_t)')
const BeginPaint = user32.func('void* BeginPaint(void*, _Out_ PAINTSTRUCT*)')
const EndPaint = user32.func('bool EndPaint(void*, PAINTSTRUCT*)')
const FillRect = user32.func('int FillRect(void*, RECT*, void*)')
const DrawTextW = user32.func('int DrawTextW(void*, const char16_t*, int, RECT*, uint32)')
const InvalidateRect = user32.func('bool InvalidateRect(void*, RECT*, int32)')
const UpdateWindow = user32.func('bool UpdateWindow(void*)')
const SetWindowPos = user32.func('bool SetWindowPos(void*, void*, int, int, int, int, uint32)')

const SWP_NOSIZE = 0x0001
const SWP_NOZORDER = 0x0004

// gdi32
const CreateSolidBrush = gdi32.func('void* CreateSolidBrush(uint32)')
const CreateFontW = gdi32.func(
  'void* CreateFontW(int, int, int, int, int, uint32, uint32, uint32, uint32, uint32, uint32, uint32, uint32, const char16_t*)'
)
const SelectObject = gdi32.func('void* SelectObject(void*, void*)')
const SetBkMode = gdi32.func('int SetBkMode(void*, int)')
const SetTextColor = gdi32.func('uint32 SetTextColor(void*, uint32)')
const DeleteObject = gdi32.func('bool DeleteObject(void*)')
const CreatePen = gdi32.func('void* CreatePen(int, int, uint32)')
const RoundRect = gdi32.func('bool RoundRect(void*, int, int, int, int, int, int)')

// kernel32
const GetModuleHandleW = kernel32.func('void* GetModuleHandleW(const char16_t*)')

// --- Состояние ---

let overlayHwnd: unknown = null

// Предсозданные GDI объекты (инициализируются в initOverlay, живут до destroyOverlay)
let gdiReady = false
let bgBrush: unknown = null
let keyBrush: unknown = null
let activeBrush: unknown = null
let borderPen: unknown = null
let fontLabel: unknown = null
let fontAltGr: unknown = null
let fontShift: unknown = null

// Переиспользуемый RECT — избегаем аллокации inline объектов в paint loop
const tmpRect = { left: 0, top: 0, right: 0, bottom: 0 }

// --- Отрисовка ---

/** Общие флаги DrawTextW: одна строка, без & мнемоник */
const DT_BASE = DT_SINGLELINE | DT_NOPREFIX

/** Вспомогательная: установить tmpRect и вызвать DrawTextW */
function drawText(hdc: unknown, text: string, l: number, t: number, r: number, b: number, flags: number): void {
  tmpRect.left = l
  tmpRect.top = t
  tmpRect.right = r
  tmpRect.bottom = b
  DrawTextW(hdc, text, -1, tmpRect, flags)
}

/** Отрисовка графической клавиатуры */
function paintOverlay(hwnd: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ps: any = {}
  const hdc = BeginPaint(hwnd, ps)
  if (!hdc) {
    return
  }

  if (!gdiReady) {
    EndPaint(hwnd, ps)
    return
  }

  // Фон окна
  tmpRect.left = 0
  tmpRect.top = 0
  tmpRect.right = OVERLAY_WIDTH
  tmpRect.bottom = OVERLAY_HEIGHT
  FillRect(hdc, tmpRect, bgBrush)

  // Прозрачный фон текста
  SetBkMode(hdc, TRANSPARENT_BK)

  // Сохранить оригинальные объекты DC
  const oldFont = SelectObject(hdc, fontLabel)
  const oldBrush = SelectObject(hdc, keyBrush)
  const oldPen = SelectObject(hdc, borderPen)

  // --- Рисуем клавиши ---

  for (let rowIdx = 0; rowIdx < KEYBOARD_ROWS.length; rowIdx++) {
    const row = KEYBOARD_ROWS[rowIdx]
    const y = PAD + rowIdx * UNIT

    let uOffset = 0
    for (const key of row) {
      const w = key.w ?? 1
      const x = PAD + Math.round(uOffset * UNIT)
      const nextX = PAD + Math.round((uOffset + w) * UNIT)
      const keyW = nextX - x - KEY_GAP
      const keyH = KEY_SIZE

      // Найти AltGr-маппинг
      const mapping = key.vk != null ? vkMap.get(key.vk) : undefined
      const half = Math.round(keyH / 2)

      // Фон клавиши (скруглённый прямоугольник)
      SelectObject(hdc, mapping ? activeBrush : keyBrush)
      RoundRect(hdc, x, y, x + keyW, y + keyH, KEY_RADIUS * 2, KEY_RADIUS * 2)

      // 4-угольная раскладка:
      //   верх-лево: EN label     верх-право: AltGr shift (синий)
      //   низ-лево:  AltGr base (синий)   низ-право: RU label

      const p = 7 // внутренний отступ
      const halfW = Math.round(keyW / 2)

      if (key.ru || mapping) {
        // --- Клавиша с символами (буквы, цифры) ---

        // Верх-лево: английский символ
        SelectObject(hdc, fontLabel)
        SetTextColor(hdc, COLOR_TEXT)
        drawText(hdc, key.label, x + p, y + p, x + halfW, y + half, DT_BASE | DT_LEFT | DT_VCENTER)

        // Низ-право: русский символ
        if (key.ru) {
          drawText(hdc, key.ru, x + halfW, y + half, x + keyW - p, y + keyH - p, DT_BASE | DT_RIGHT | DT_VCENTER)
        }

        // AltGr символы (синие)
        if (mapping) {
          SetTextColor(hdc, COLOR_ALTGR)

          // Низ-лево: AltGr base символ
          SelectObject(hdc, fontAltGr)
          drawText(
            hdc,
            displayChar(mapping.char),
            x + p,
            y + half,
            x + halfW,
            y + keyH - p,
            DT_BASE | DT_LEFT | DT_VCENTER
          )

          // Верх-право: AltGr shift символ (если есть)
          if (mapping.shiftChar) {
            SelectObject(hdc, fontShift)
            drawText(hdc, mapping.shiftChar, x + halfW, y + p, x + keyW - p, y + half, DT_BASE | DT_RIGHT | DT_VCENTER)
          }
        }
      } else {
        // --- Модификатор / служебная клавиша (label по центру) ---
        SelectObject(hdc, fontLabel)
        SetTextColor(hdc, COLOR_TEXT)
        drawText(hdc, key.label, x + p, y + p, x + keyW - p, y + keyH - p, DT_BASE | DT_CENTER | DT_VCENTER)
      }

      uOffset += w
    }
  }

  // Восстановить оригинальные объекты DC
  SelectObject(hdc, oldFont)
  SelectObject(hdc, oldBrush)
  SelectObject(hdc, oldPen)

  EndPaint(hwnd, ps)
}

/** Оконная процедура Win32 */
function wndProc(hwnd: unknown, msg: number, _wParam: unknown, _lParam: unknown): number | bigint {
  if (msg === WM_PAINT) {
    paintOverlay(hwnd)
    return 0
  }
  if (msg === WM_ERASEBKGND) {
    return 1 // не стирать фон — рисуем сами
  }
  return DefWindowProcW(hwnd, msg, _wParam, _lParam)
}

// Регистрируем callback на уровне модуля чтобы избежать GC
const wndProcCb = koffi.register(wndProc, koffi.pointer(WNDPROC))

// --- Публичные функции ---

/** Создать overlay окно (скрытое). Возвращает true при успехе. */
export function initOverlay(): boolean {
  try {
    // Предсоздать GDI объекты — живут до destroyOverlay
    bgBrush = CreateSolidBrush(COLOR_BG)
    keyBrush = CreateSolidBrush(COLOR_KEY)
    activeBrush = CreateSolidBrush(COLOR_KEY_ACTIVE)
    borderPen = CreatePen(PS_SOLID, 1, COLOR_BORDER)
    fontLabel = CreateFontW(-15, 0, 0, 0, FW_NORMAL, 0, 0, 0, 1, 0, 0, 5, 0, 'Segoe UI')
    fontAltGr = CreateFontW(-18, 0, 0, 0, FW_BOLD, 0, 0, 0, 1, 0, 0, 5, 0, 'Segoe UI')
    fontShift = CreateFontW(-12, 0, 0, 0, FW_NORMAL, 0, 0, 0, 1, 0, 0, 5, 0, 'Segoe UI')
    gdiReady = true

    const hInstance = GetModuleHandleW(null)
    const hCursor = LoadCursorW(null, IDC_ARROW)

    const wc = {
      cbSize: koffi.sizeof(WNDCLASSEXW),
      style: 0,
      lpfnWndProc: wndProcCb,
      cbClsExtra: 0,
      cbWndExtra: 0,
      hInstance,
      hIcon: null,
      hCursor,
      hbrBackground: null,
      lpszMenuName: null,
      lpszClassName: 'KamiKeyTheOverlay',
      hIconSm: null,
    }

    const atom = RegisterClassExW(wc)
    if (!atom) {
      console.warn('Overlay: не удалось зарегистрировать класс окна')
      return false
    }

    // Центрирование на активном мониторе
    const pos = getCenterOnActiveMonitor(OVERLAY_WIDTH, OVERLAY_HEIGHT)
    const x = pos.x
    const y = pos.y

    const exStyle = WS_EX_TOPMOST | WS_EX_LAYERED | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TRANSPARENT

    overlayHwnd = CreateWindowExW(
      exStyle,
      'KamiKeyTheOverlay',
      'KamiKeyThe',
      WS_POPUP,
      x,
      y,
      OVERLAY_WIDTH,
      OVERLAY_HEIGHT,
      null,
      null,
      hInstance,
      null
    )

    if (!overlayHwnd) {
      console.warn('Overlay: не удалось создать окно')
      return false
    }

    // Прозрачность
    SetLayeredWindowAttributes(overlayHwnd, 0, OVERLAY_ALPHA, LWA_ALPHA)

    console.log('Overlay инициализирован (удерживайте AltGr > 500мс)')
    return true
  } catch (err) {
    console.warn('Overlay: ошибка инициализации:', err)
    return false
  }
}

/** Переместить overlay на монитор с активным окном */
function repositionOverlay(): void {
  if (!overlayHwnd) {
    return
  }
  const pos = getCenterOnActiveMonitor(OVERLAY_WIDTH, OVERLAY_HEIGHT)
  SetWindowPos(overlayHwnd, null, pos.x, pos.y, 0, 0, SWP_NOSIZE | SWP_NOZORDER)
}

/** Показать overlay */
export function showOverlay(): void {
  if (overlayHwnd) {
    repositionOverlay()
    ShowWindow(overlayHwnd, SW_SHOWNOACTIVATE)
    InvalidateRect(overlayHwnd, null, 1)
    UpdateWindow(overlayHwnd)
  }
}

/** Скрыть overlay */
export function hideOverlay(): void {
  if (overlayHwnd) {
    ShowWindow(overlayHwnd, SW_HIDE)
  }
}

/** Уничтожить overlay и освободить GDI объекты */
export function destroyOverlay(): void {
  if (overlayHwnd) {
    DestroyWindow(overlayHwnd)
    overlayHwnd = null
  }

  // Удалить предсозданные GDI объекты
  if (gdiReady) {
    if (bgBrush) {
      DeleteObject(bgBrush)
    }
    if (keyBrush) {
      DeleteObject(keyBrush)
    }
    if (activeBrush) {
      DeleteObject(activeBrush)
    }
    if (borderPen) {
      DeleteObject(borderPen)
    }
    if (fontLabel) {
      DeleteObject(fontLabel)
    }
    if (fontAltGr) {
      DeleteObject(fontAltGr)
    }
    if (fontShift) {
      DeleteObject(fontShift)
    }
    bgBrush = null
    keyBrush = null
    activeBrush = null
    borderPen = null
    fontLabel = null
    fontAltGr = null
    fontShift = null
    gdiReady = false
  }
}
