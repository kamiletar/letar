/**
 * Конфигурация горячих клавиш для Animatrona
 *
 * Категории:
 * - navigation — переходы между страницами
 * - actions — действия (импорт, обновить и т.д.)
 * - player — управление плеером
 * - chapters — редактор глав
 */

/** Элемент горячей клавиши */
export interface ShortcutItem {
  /** Массив клавиш для отображения (например: ['Ctrl', 'K']) */
  keys: string[]
  /** Описание действия */
  description: string
  /** Действие при нажатии (опционально — может обрабатываться компонентом) */
  action?: () => void
}

/** Категория горячих клавиш */
export interface ShortcutCategory {
  /** Название категории */
  name: string
  /** Список горячих клавиш */
  items: ShortcutItem[]
}

/** Пути для навигации по цифрам 1-4 */
export const NAV_PATHS = ['/library', '/player', '/test-encoding', '/settings'] as const

/**
 * Конфигурация всех горячих клавиш
 * Используется в ShortcutsCheatsheet для отображения и в useGlobalShortcuts для обработки
 */
export const SHORTCUTS_CONFIG: ShortcutCategory[] = [
  {
    name: 'Навигация',
    items: [
      { keys: ['1'], description: 'Библиотека' },
      { keys: ['2'], description: 'Плеер' },
      { keys: ['3'], description: 'Тест профилей' },
      { keys: ['4'], description: 'Настройки' },
    ],
  },
  {
    name: 'Действия',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Command Palette' },
      { keys: ['Ctrl', 'I'], description: 'Импорт видео' },
      { keys: ['Ctrl', '/'], description: 'Горячие клавиши' },
      { keys: ['Esc'], description: 'Закрыть окно' },
    ],
  },
  {
    name: 'Плеер',
    items: [
      { keys: ['Space'], description: 'Play / Pause' },
      { keys: ['←', '→'], description: '±5 секунд' },
      { keys: ['↑', '↓'], description: 'Громкость ±5%' },
      { keys: ['F'], description: 'Полный экран' },
      { keys: ['M'], description: 'Выкл. звук' },
      { keys: ['N'], description: 'Следующий эпизод' },
      { keys: ['P'], description: 'Предыдущий эпизод' },
      { keys: ['[', ']'], description: 'Скорость ±0.25x' },
      { keys: ['I'], description: 'Информация о видео' },
    ],
  },
  {
    name: 'Редактор глав',
    items: [
      { keys: ['O'], description: 'Пометить Opening' },
      { keys: ['E'], description: 'Пометить Ending' },
      { keys: ['R'], description: 'Пометить Recap' },
      { keys: ['V'], description: 'Пометить Preview' },
      { keys: ['C'], description: 'Новая глава' },
    ],
  },
]

/**
 * Проверяет, находится ли фокус в текстовом поле
 * Используется для игнорирования хоткеев при вводе текста
 */
export function isInputFocused(): boolean {
  const activeElement = document.activeElement
  if (!activeElement) {
    return false
  }

  const tagName = activeElement.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea') {
    return true
  }

  // Проверяем contenteditable
  if (activeElement.getAttribute('contenteditable') === 'true') {
    return true
  }

  // Проверяем роль textbox (для Chakra Input и др.)
  if (activeElement.getAttribute('role') === 'textbox') {
    return true
  }

  return false
}
