import type { IconType } from 'react-icons'
import { LuFilm, LuFolderPlus, LuKeyboard, LuPlay, LuRefreshCw, LuSettings, LuTestTube, LuUpload } from 'react-icons/lu'

/**
 * Тип команды в Command Palette
 */
export interface Command {
  /** Уникальный идентификатор */
  id: string
  /** Название для отображения */
  label: string
  /** Описание (опционально) */
  description?: string
  /** Иконка */
  icon: IconType
  /** Категория для группировки */
  category: 'navigation' | 'action' | 'search'
  /** Хоткей для отображения (опционально) */
  shortcut?: string[]
  /** Ключевые слова для поиска */
  keywords?: string[]
}

/**
 * Список всех доступных команд
 */
export const COMMANDS: Command[] = [
  // Навигация
  {
    id: 'nav:library',
    label: 'Библиотека',
    description: 'Перейти к библиотеке аниме',
    icon: LuFilm,
    category: 'navigation',
    shortcut: ['1'],
    keywords: ['library', 'anime', 'список', 'аниме'],
  },
  {
    id: 'nav:player',
    label: 'Плеер',
    description: 'Открыть видеоплеер',
    icon: LuPlay,
    category: 'navigation',
    shortcut: ['2'],
    keywords: ['player', 'watch', 'смотреть', 'видео'],
  },
  {
    id: 'nav:test-encoding',
    label: 'Тест профилей',
    description: 'Тестирование профилей кодирования',
    icon: LuTestTube,
    category: 'navigation',
    shortcut: ['3'],
    keywords: ['test', 'encoding', 'vmaf', 'тест', 'профиль', 'качество'],
  },
  {
    id: 'nav:settings',
    label: 'Настройки',
    description: 'Открыть настройки приложения',
    icon: LuSettings,
    category: 'navigation',
    shortcut: ['4'],
    keywords: ['settings', 'preferences', 'config', 'настройки'],
  },

  // Действия
  {
    id: 'action:import',
    label: 'Импортировать видео',
    description: 'Открыть визард импорта',
    icon: LuFolderPlus,
    category: 'action',
    shortcut: ['Ctrl', 'I'],
    keywords: ['import', 'folder', 'импорт', 'папка', 'добавить'],
  },
  {
    id: 'action:export',
    label: 'Экспортировать аниме',
    description: 'Экспорт выбранного аниме в MKV',
    icon: LuUpload,
    category: 'action',
    keywords: ['export', 'mkv', 'экспорт', 'выгрузить'],
  },
  {
    id: 'action:refresh-metadata',
    label: 'Обновить метаданные',
    description: 'Обновить метаданные из Shikimori',
    icon: LuRefreshCw,
    category: 'action',
    keywords: ['refresh', 'metadata', 'shikimori', 'обновить', 'метаданные'],
  },
  {
    id: 'action:shortcuts',
    label: 'Горячие клавиши',
    description: 'Показать список горячих клавиш',
    icon: LuKeyboard,
    category: 'action',
    shortcut: ['Ctrl', '/'],
    keywords: ['shortcuts', 'hotkeys', 'keyboard', 'хоткеи', 'клавиши'],
  },
]

/**
 * Названия категорий для отображения
 */
export const CATEGORY_LABELS: Record<Command['category'], string> = {
  navigation: 'Навигация',
  action: 'Действия',
  search: 'Поиск',
}

/**
 * Фильтрация команд по поисковому запросу
 */
export function filterCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) {
    return commands
  }

  const lowerQuery = query.toLowerCase()

  return commands.filter((cmd) => {
    // Поиск по названию
    if (cmd.label.toLowerCase().includes(lowerQuery)) {
      return true
    }
    // Поиск по описанию
    if (cmd.description?.toLowerCase().includes(lowerQuery)) {
      return true
    }
    // Поиск по ключевым словам
    if (cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))) {
      return true
    }
    return false
  })
}

/**
 * Группировка команд по категориям
 */
export function groupCommandsByCategory(commands: Command[]): Map<Command['category'], Command[]> {
  const groups = new Map<Command['category'], Command[]>()

  for (const cmd of commands) {
    const existing = groups.get(cmd.category) || []
    groups.set(cmd.category, [...existing, cmd])
  }

  return groups
}
