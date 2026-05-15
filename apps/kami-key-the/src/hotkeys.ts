/**
 * Win32 hotkeys через Koffi
 *
 * RegisterHotKey — перехват AltGr+клавиша и AltGr+Shift+клавиша
 * SendInput — вставка Unicode символов и виртуальных клавиш
 *
 * В Electron Chromium поглощает thread-level WM_HOTKEY (RegisterHotKey с hwnd=NULL).
 * Решение: скрытое окно с WndProc — RegisterHotKey с реальным HWND,
 * Chromium диспатчит WM_HOTKEY в наш WndProc через DispatchMessage.
 *
 * Системные хоткеи (AltGr+Ё, AltGr+Shift+Ё) — регистрируются отдельно,
 * не зависят от toggle (работают даже при «выключенном» режиме).
 */

import koffi from 'koffi'
import { getAppProfileLayout, isCurrentWindowExcluded } from './exclusions.js'
import { getCharByHotkeyId, getKeymap, getShiftKeymap, getSpecialActions, updateKeymap } from './keymap.js'
import type { KeymapConfig } from './types.js'

// --- Win32 константы ---

const MOD_ALT = 0x0001
const MOD_CONTROL = 0x0002
const MOD_SHIFT = 0x0004
// AltGr на Windows = Ctrl+Alt
const MOD_ALTGR = MOD_CONTROL | MOD_ALT

const WM_HOTKEY = 0x0312

const INPUT_KEYBOARD = 1
const KEYEVENTF_UNICODE = 0x0004
const KEYEVENTF_KEYUP = 0x0002
const KEYEVENTF_EXTENDEDKEY = 0x0001

// VK для спецдействий
const VK_HOME = 0x24
const VK_END = 0x23
const VK_DELETE = 0x2e
const VK_SHIFT = 0x10
const VK_RMENU = 0xa5 // Right Alt (AltGr)
const VK_OEM_3 = 0xc0 // клавиша Ё / `

/** Порог удержания AltGr для показа overlay (мс) */
const ALTGR_HOLD_THRESHOLD = 500

/** Начальный ID для системных хоткеев (не пересекается с маппингами) */
const SYSTEM_HOTKEY_BASE = 9000
const SYSTEM_HOTKEY_CYCLE_LAYOUT = SYSTEM_HOTKEY_BASE
const SYSTEM_HOTKEY_OPEN_EDITOR = SYSTEM_HOTKEY_BASE + 1
const SYSTEM_HOTKEY_COUNT = 2

// --- Win32 структуры ---

const KEYBDINPUT = koffi.struct('KEYBDINPUT', {
  wVk: 'uint16',
  wScan: 'uint16',
  dwFlags: 'uint32',
  time: 'uint32',
  dwExtraInfo: 'uintptr_t',
})

// INPUT содержит union (MOUSEINPUT | KEYBDINPUT | HARDWAREINPUT).
// MOUSEINPUT — самый большой (32 байта на x64), KEYBDINPUT — 24 байта.
// Паддинг _unionPad дополняет до размера union.
// Без него sizeof(INPUT)=32 вместо 40, и SendInput молча отказывает.
const INPUT = koffi.struct('INPUT', {
  type: 'uint32',
  _padding: 'uint32', // выравнивание union на x64
  ki: KEYBDINPUT,
  _unionPad: koffi.array('uint8', 8), // MOUSEINPUT(32) - KEYBDINPUT(24) = 8
})

// --- Win32 функции ---

const user32 = koffi.load('user32.dll')
const kernel32 = koffi.load('kernel32.dll')

const RegisterHotKey = user32.func('bool RegisterHotKey(void *hwnd, int id, uint32 fsModifiers, uint32 vk)')
const UnregisterHotKey = user32.func('bool UnregisterHotKey(void *hwnd, int id)')
const SendInput = user32.func('uint32 SendInput(uint32 nInputs, INPUT *pInputs, int cbSize)')
const GetLastError = kernel32.func('uint32 GetLastError()')
const GetAsyncKeyState = user32.func('int16 GetAsyncKeyState(int vk)')

// --- Скрытое окно для приёма WM_HOTKEY (Electron-совместимость) ---
// В Electron Chromium поглощает thread-level сообщения. RegisterHotKey с HWND
// направляет WM_HOTKEY конкретному окну → Chromium dispatch'ит в наш WndProc.

const WS_POPUP = 0x80000000

const WNDCLASSEXW_HK = koffi.struct('WNDCLASSEXW_HK', {
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

const WNDPROC_HK = koffi.proto('intptr_t __stdcall WNDPROC_HK(void*, uint32, uintptr_t, intptr_t)')

const RegisterClassExW_HK = user32.func('uint16 RegisterClassExW(WNDCLASSEXW_HK*)')
const CreateWindowExW_HK = user32.func(
  'void* CreateWindowExW(uint32, const char16_t*, const char16_t*, uint32, int, int, int, int, void*, void*, void*, void*)'
)
const DefWindowProcW_HK = user32.func('intptr_t DefWindowProcW(void*, uint32, uintptr_t, intptr_t)')
const DestroyWindow_HK = user32.func('bool DestroyWindow(void*)')
const GetModuleHandleW_HK = kernel32.func('void* GetModuleHandleW(const char16_t*)')

/** Коды ошибок Win32 для диагностики */
const ERROR_HOTKEY_ALREADY_REGISTERED = 1409
const ERROR_CODES: Record<number, string> = {
  [ERROR_HOTKEY_ALREADY_REGISTERED]: 'уже зарегистрирован другим приложением',
  1004: 'неверные модификаторы',
  87: 'неверный параметр',
}

// --- Состояние ---

let pumpTimer: ReturnType<typeof setTimeout> | null = null
let registered = false
let systemHotkeysRegistered = false

/** Общее количество зарегистрированных hotkey ID (маппинги) */
let totalHotkeyCount = 0
/** ID начала спец. действий (для разделения символов и действий) */
let specialActionsStartId = 0

// AltGr hold — детекция удержания для overlay
let altGrHoldStart: number | null = null
let altGrOverlayShown = false
let onAltGrHold: (() => void) | null = null
let onAltGrRelease: (() => void) | null = null

// Колбэки системных хоткеев
let onCycleLayout: (() => void) | null = null
let onOpenEditor: (() => void) | null = null

// Колбэк при успешной отправке символа (для статистики)
let onCharSent: ((char: string) => void) | null = null

// Колбэк для per-app профилей: получить маппинги указанной раскладки
let onGetLayoutChar: ((layoutName: string, hotkeyId: number) => string | undefined) | null = null

// Скрытое окно для приёма WM_HOTKEY
let hotkeyHwnd: unknown = null

// --- Внутренние функции ---

const UNION_PAD = [0, 0, 0, 0, 0, 0, 0, 0]

/** Создать INPUT struct для виртуальной клавиши */
function vkInput(vk: number, flags: number) {
  return {
    type: INPUT_KEYBOARD,
    _padding: 0,
    ki: { wVk: vk, wScan: 0, dwFlags: flags, time: 0, dwExtraInfo: 0 },
    _unionPad: UNION_PAD,
  }
}

/** Отправить Unicode символ через SendInput */
function sendUnicodeChar(char: string): void {
  const code = char.codePointAt(0)
  if (code === undefined) {
    return
  }

  const inputs = [
    {
      type: INPUT_KEYBOARD,
      _padding: 0,
      ki: { wVk: 0, wScan: code, dwFlags: KEYEVENTF_UNICODE, time: 0, dwExtraInfo: 0 },
      _unionPad: UNION_PAD,
    },
    {
      type: INPUT_KEYBOARD,
      _padding: 0,
      ki: { wVk: 0, wScan: code, dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0 },
      _unionPad: UNION_PAD,
    },
  ]

  SendInput(2, inputs, koffi.sizeof(INPUT))
}

/** «Камикадзе» — очистка текущей строки: Home → Shift+End → Delete */
function clearLine(): void {
  const inputs = [
    // Home (перейти в начало строки)
    vkInput(VK_HOME, KEYEVENTF_EXTENDEDKEY),
    vkInput(VK_HOME, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP),
    // Shift down
    vkInput(VK_SHIFT, 0),
    // End (выделить до конца строки)
    vkInput(VK_END, KEYEVENTF_EXTENDEDKEY),
    vkInput(VK_END, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP),
    // Shift up
    vkInput(VK_SHIFT, KEYEVENTF_KEYUP),
    // Delete (удалить выделенное)
    vkInput(VK_DELETE, KEYEVENTF_EXTENDEDKEY),
    vkInput(VK_DELETE, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP),
  ]

  SendInput(inputs.length, inputs, koffi.sizeof(INPUT))
}

/** Обработать специальное действие по ID */
function handleSpecialAction(actionIndex: number): void {
  const actions = getSpecialActions()
  const action = actions[actionIndex]
  if (!action) {
    return
  }

  switch (action.action) {
    case 'clear-line':
      clearLine()
      break
    default:
      console.error(`Неизвестное действие: ${action.action}`)
  }
}

/** Проверить удержание AltGr и показать/скрыть overlay */
function checkAltGrHold(): void {
  const state = GetAsyncKeyState(VK_RMENU)
  const isPressed = (state & 0x8000) !== 0

  if (isPressed) {
    if (altGrHoldStart === null) {
      altGrHoldStart = Date.now()
    } else if (!altGrOverlayShown && Date.now() - altGrHoldStart >= ALTGR_HOLD_THRESHOLD) {
      altGrOverlayShown = true
      onAltGrHold?.()
    }
  } else {
    if (altGrOverlayShown) {
      altGrOverlayShown = false
      onAltGrRelease?.()
    }
    altGrHoldStart = null
  }
}

// --- Обработка WM_HOTKEY (вынесено для переиспользования в WndProc) ---

/** Обработать WM_HOTKEY по hotkeyId (единая логика для PeekMessage и WndProc) */
function handleHotkeyMessage(hotkeyId: number): void {
  // Системные хоткеи (ID 9000+) — обрабатываются ВСЕГДА
  if (hotkeyId === SYSTEM_HOTKEY_CYCLE_LAYOUT) {
    onCycleLayout?.()
    return
  }
  if (hotkeyId === SYSTEM_HOTKEY_OPEN_EDITOR) {
    onOpenEditor?.()
    return
  }

  // Пропуск SendInput для исключённых приложений
  if (isCurrentWindowExcluded()) {
    return
  }

  // Спец. действия (Камикадзе и т.д.)
  if (hotkeyId >= specialActionsStartId) {
    handleSpecialAction(hotkeyId - specialActionsStartId)
    return
  }

  // Unicode символы (normal + shift layers)
  const appLayout = getAppProfileLayout()
  let char: string | undefined
  if (appLayout && onGetLayoutChar) {
    char = onGetLayoutChar(appLayout, hotkeyId)
  }
  if (!char) {
    char = getCharByHotkeyId(hotkeyId)
  }
  if (char) {
    sendUnicodeChar(char)
    onCharSent?.(char)
  }
}

/** WndProc для скрытого окна — обрабатывает WM_HOTKEY */
function hotkeyWndProc(_hwnd: unknown, uMsg: number, wParam: unknown, _lParam: unknown): number | bigint {
  if (uMsg === WM_HOTKEY) {
    handleHotkeyMessage(Number(wParam))
    return 0
  }
  return DefWindowProcW_HK(_hwnd, uMsg, wParam, _lParam)
}

// Регистрируем callback на уровне модуля для защиты от GC
const hotkeyWndProcCb = koffi.register(hotkeyWndProc, koffi.pointer(WNDPROC_HK))

// --- Публичные функции ---

/** Создать скрытое окно для приёма WM_HOTKEY (вызвать перед registerHotkeys) */
export function initHotkeyWindow(): boolean {
  if (hotkeyHwnd) {
    return true
  }

  const hInstance = GetModuleHandleW_HK(null)

  const wc = {
    cbSize: koffi.sizeof(WNDCLASSEXW_HK),
    style: 0,
    lpfnWndProc: hotkeyWndProcCb,
    cbClsExtra: 0,
    cbWndExtra: 0,
    hInstance,
    hIcon: null,
    hCursor: null,
    hbrBackground: null,
    lpszMenuName: null,
    lpszClassName: 'KamiKeyTheHotkey',
    hIconSm: null,
  }

  const atom = RegisterClassExW_HK(wc)
  if (!atom) {
    console.error('Hotkey window: не удалось зарегистрировать класс')
    return false
  }

  hotkeyHwnd = CreateWindowExW_HK(
    0, // dwExStyle
    'KamiKeyTheHotkey', // className
    'KamiKeyTheHotkey', // windowName
    WS_POPUP, // style (невидимое)
    0,
    0,
    0,
    0, // x, y, w, h
    null,
    null,
    hInstance,
    null
  )

  if (!hotkeyHwnd) {
    console.error('Hotkey window: не удалось создать окно')
    return false
  }

  console.log('Hotkey window создано (Electron-совместимый приём WM_HOTKEY)')
  return true
}

/** Уничтожить скрытое окно */
export function destroyHotkeyWindow(): void {
  if (hotkeyHwnd) {
    DestroyWindow_HK(hotkeyHwnd)
    hotkeyHwnd = null
  }
}

/** Установить колбэки для overlay (вызов при удержании/отпускании AltGr) */
export function setOverlayCallbacks(hold: () => void, release: () => void): void {
  onAltGrHold = hold
  onAltGrRelease = release
}

/** Задать колбэки системных хоткеев */
export function setSystemHotkeyCallbacks(cycle: () => void, editor: () => void): void {
  onCycleLayout = cycle
  onOpenEditor = editor
}

/** Задать колбэк при отправке символа (для статистики) */
export function setCharSentCallback(cb: (char: string) => void): void {
  onCharSent = cb
}

/** Задать колбэк для получения символа из per-app раскладки */
export function setLayoutCharCallback(cb: (layoutName: string, hotkeyId: number) => string | undefined): void {
  onGetLayoutChar = cb
}

/** Зарегистрировать маппинг-хоткеи (AltGr+клавиша, AltGr+Shift+клавиша, спецдействия) */
export function registerHotkeys(): boolean {
  if (registered) {
    return true
  }

  const keymap = getKeymap()
  const shiftKeymap = getShiftKeymap()
  const specialActions = getSpecialActions()

  let ok = true
  let id = 0

  // Слой 1: AltGr+клавиша
  for (const mapping of keymap) {
    const result = RegisterHotKey(hotkeyHwnd, id, MOD_ALTGR, mapping.vk)
    if (!result) {
      const err = GetLastError()
      const reason = ERROR_CODES[err] ?? `код ${err}`
      console.error(`  ✗ AltGr+${mapping.label} — ${reason}`)
      ok = false
    } else {
      console.log(`  AltGr → ${mapping.label}`)
    }
    id++
  }

  // Слой 2: AltGr+Shift+клавиша (shift-варианты из KEYMAP)
  for (const mapping of shiftKeymap) {
    const result = RegisterHotKey(hotkeyHwnd, id, MOD_ALTGR | MOD_SHIFT, mapping.vk)
    if (!result) {
      const err = GetLastError()
      const reason = ERROR_CODES[err] ?? `код ${err}`
      console.error(`  ✗ AltGr+Shift+${mapping.shiftLabel} — ${reason}`)
      ok = false
    } else {
      console.log(`  AltGr+Shift → ${mapping.shiftLabel}`)
    }
    id++
  }

  // Спец. действия (собственные модификаторы)
  specialActionsStartId = id
  for (const action of specialActions) {
    const result = RegisterHotKey(hotkeyHwnd, id, action.modifiers, action.vk)
    if (!result) {
      const err = GetLastError()
      const reason = ERROR_CODES[err] ?? `код ${err}`
      console.error(`  ✗ ${action.label} — ${reason}`)
      ok = false
    } else {
      console.log(`  ⚡ ${action.label}`)
    }
    id++
  }

  totalHotkeyCount = id
  registered = true
  return ok
}

/** Снять маппинг-хоткеи */
export function unregisterHotkeys(): void {
  if (!registered) {
    return
  }

  for (let i = 0; i < totalHotkeyCount; i++) {
    UnregisterHotKey(hotkeyHwnd, i)
  }

  registered = false
  console.log('Хоткеи сняты')
}

/** Зарегистрировать системные хоткеи (AltGr+Ё, AltGr+Shift+Ё) */
export function registerSystemHotkeys(): void {
  if (systemHotkeysRegistered) {
    return
  }

  // AltGr+Ё → переключить раскладку
  const r1 = RegisterHotKey(hotkeyHwnd, SYSTEM_HOTKEY_CYCLE_LAYOUT, MOD_ALTGR, VK_OEM_3)
  if (!r1) {
    const err = GetLastError()
    console.error(`  ✗ AltGr+Ё (переключение раскладки) — ${ERROR_CODES[err] ?? `код ${err}`}`)
  } else {
    console.log('  🔄 AltGr+Ё → переключение раскладки')
  }

  // AltGr+Shift+Ё → открыть редактор
  const r2 = RegisterHotKey(hotkeyHwnd, SYSTEM_HOTKEY_OPEN_EDITOR, MOD_ALTGR | MOD_SHIFT, VK_OEM_3)
  if (!r2) {
    const err = GetLastError()
    console.error(`  ✗ AltGr+Shift+Ё (редактор) — ${ERROR_CODES[err] ?? `код ${err}`}`)
  } else {
    console.log('  ⌨ AltGr+Shift+Ё → редактор маппингов')
  }

  systemHotkeysRegistered = true
}

/** Снять системные хоткеи */
export function unregisterSystemHotkeys(): void {
  if (!systemHotkeysRegistered) {
    return
  }

  for (let i = 0; i < SYSTEM_HOTKEY_COUNT; i++) {
    UnregisterHotKey(hotkeyHwnd, SYSTEM_HOTKEY_BASE + i)
  }

  systemHotkeysRegistered = false
}

/** Перерегистрация маппинг-хоткеев: unregister → updateKeymap → register */
export function reloadHotkeys(config: KeymapConfig): void {
  unregisterHotkeys()
  updateKeymap(config)
  console.log('Перерегистрация хоткеев:')
  registerHotkeys()
}

/** Запустить AltGr hold detection (WM_HOTKEY обрабатывается WndProc) */
export function startMessagePump(): void {
  if (pumpTimer) {
    return
  }

  function pump() {
    // WM_HOTKEY обрабатывается через WndProc скрытого окна (Chromium dispatch'ит).
    // WM_PAINT для overlay/notification — тоже через их WndProc.
    // Здесь остаётся только polling GetAsyncKeyState для AltGr hold.
    checkAltGrHold()
    pumpTimer = setTimeout(pump, 5)
  }

  pump()
  console.log('Message pump запущен')
}

/** Остановить message pump */
export function stopMessagePump(): void {
  if (pumpTimer) {
    clearTimeout(pumpTimer)
    pumpTimer = null
    console.log('Message pump остановлен')
  }
}
