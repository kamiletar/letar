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
import { KEYBOARD_ROWS } from '../shared/keyboard-layout'
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

const KEY_SIZE = 70 // px — стандартная клавиша (было мелко — увеличено на ~25%)
const KEY_GAP = 5 // px между клавишами
const KEY_RADIUS = 7 // px скругление
const UNIT = KEY_SIZE + KEY_GAP // 75px — шаг сетки

// Размер окна вычисляется из содержимого
const CONTENT_WIDTH = 15 * UNIT - KEY_GAP // 1120
const CONTENT_HEIGHT = 5 * UNIT - KEY_GAP // 370
const PAD = 25 // отступ от края окна
const OVERLAY_WIDTH = CONTENT_WIDTH + PAD * 2 // 1170
const OVERLAY_HEIGHT = CONTENT_HEIGHT + PAD * 2 // 420

// --- Цвета (COLORREF = 0x00BBGGRR) ---
//
// Та же палитра, что и в редакторе (renderer/src/theme.ts, тёмная тема) — значения сняты
// напрямую с отрендеренных элементов (getComputedStyle), не подобраны на глаз. GDI не умеет
// alpha-blending кистей/перьев, поэтому полупрозрачные токены (`brand.subtle` 9%, `brand.border`
// 50%) заранее смешаны с фоном overlay (bg #0B0E0C) в сплошной цвет.

const COLOR_BG = 0x000c0e0b // #0B0E0C — bg (тёмная тема)
const COLOR_KEY = 0x001c211b // #1B211C — bg.muted (клавиша без маппинга)
const COLOR_KEY_ACTIVE = 0x000d240f // #0F240D — brand.subtle (rgba(57,255,20,.09)) поверх bg
const COLOR_BORDER = 0x002b322a // #2A322B — border (клавиша без маппинга)
const COLOR_BORDER_ACTIVE = 0x00108722 // #228710 — brand.border (rgba(57,255,20,.5)) поверх bg
const COLOR_TEXT = 0x0095a093 // #93A095 — fg.subtle (EN подпись)
const COLOR_TEXT_RU = 0x008e8cb2 // #B28C8E — fg.ru (RU подпись, тёплый красноватый оттенок)
const COLOR_BRAND = 0x0014ff39 // #39FF14 — brand.fg, AltGr-символ (низ-право)
const COLOR_ACCENT = 0x00eed322 // #22D3EE — accent.fg, AltGr+Shift-символ (верх-право)

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

  // Оверлей может быть уже показан (AltGr зажат) в момент переключения раскладки
  // (AltGr+Ё) — без явной перерисовки WM_PAINT не придёт сам, и подсказка останется
  // со старыми символами до следующего показа.
  if (overlayHwnd) {
    InvalidateRect(overlayHwnd, null, 1)
    UpdateWindow(overlayHwnd)
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
  'void* CreateWindowExW(uint32, const char16_t*, const char16_t*, uint32, int, int, int, int, void*, void*, void*, void*)',
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
  'void* CreateFontW(int, int, int, int, int, uint32, uint32, uint32, uint32, uint32, uint32, uint32, uint32, const char16_t*)',
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
let activeBorderPen: unknown = null
let fontLabel: unknown = null
let fontSymbol: unknown = null

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
      const mapping = key.vk !== null && key.vk !== undefined ? vkMap.get(key.vk) : undefined
      const half = Math.round(keyH / 2)

      // Фон + обводка клавиши (скруглённый прямоугольник) — те же токены, что и активная/
      // неактивная клавиша в редакторе (key-button.tsx)
      SelectObject(hdc, mapping ? activeBrush : keyBrush)
      SelectObject(hdc, mapping ? activeBorderPen : borderPen)
      RoundRect(hdc, x, y, x + keyW, y + keyH, KEY_RADIUS * 2, KEY_RADIUS * 2)

      // Та же раскладка углов, что в key-button.tsx (renderer):
      //   верх-лево: EN label            верх-право: AltGr+Shift (циан)
      //   низ-лево:  RU label            низ-право:  AltGr base (зелёный)

      const p = 9 // внутренний отступ
      const halfW = Math.round(keyW / 2)

      if (key.ru || mapping) {
        // --- Клавиша с символами (буквы, цифры) ---

        // Верх-лево: английский символ
        SelectObject(hdc, fontLabel)
        SetTextColor(hdc, COLOR_TEXT)
        drawText(hdc, key.label, x + p, y + p, x + halfW, y + half, DT_BASE | DT_LEFT | DT_VCENTER)

        // Низ-лево: русский символ (приглушённый красноватый — отличает от EN)
        if (key.ru) {
          SetTextColor(hdc, COLOR_TEXT_RU)
          drawText(hdc, key.ru, x + p, y + half, x + halfW, y + keyH - p, DT_BASE | DT_LEFT | DT_VCENTER)
        }

        // AltGr символы — одинаковый размер, разный цвет/угол (как в редакторе)
        if (mapping) {
          SelectObject(hdc, fontSymbol)

          // Низ-право: AltGr base символ (зелёный)
          SetTextColor(hdc, COLOR_BRAND)
          drawText(
            hdc,
            displayChar(mapping.char),
            x + halfW,
            y + half,
            x + keyW - p,
            y + keyH - p,
            DT_BASE | DT_RIGHT | DT_VCENTER,
          )

          // Верх-право: AltGr+Shift символ (циан), если есть
          if (mapping.shiftChar) {
            SetTextColor(hdc, COLOR_ACCENT)
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
    activeBorderPen = CreatePen(PS_SOLID, 1, COLOR_BORDER_ACTIVE)
    fontLabel = CreateFontW(-19, 0, 0, 0, FW_NORMAL, 0, 0, 0, 1, 0, 0, 5, 0, 'Segoe UI')
    // Один размер/начертание для обоих AltGr-символов (базового и Shift) — как в key-button.tsx
    fontSymbol = CreateFontW(-20, 0, 0, 0, FW_BOLD, 0, 0, 0, 1, 0, 0, 5, 0, 'Segoe UI')
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
      null,
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
    if (activeBorderPen) {
      DeleteObject(activeBorderPen)
    }
    if (fontLabel) {
      DeleteObject(fontLabel)
    }
    if (fontSymbol) {
      DeleteObject(fontSymbol)
    }
    bgBrush = null
    keyBrush = null
    activeBrush = null
    borderPen = null
    activeBorderPen = null
    fontLabel = null
    fontSymbol = null
    gdiReady = false
  }
}
