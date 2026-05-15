import type { IconType } from 'react-icons'

/**
 * Элемент навигации админ-панели.
 */
export interface AdminNavItem {
  /** URL страницы */
  href: string
  /** Название пункта меню */
  label: string
  /** Иконка из react-icons */
  icon: IconType
  /** Бейдж (число или текст) */
  badge?: number | string
}

/**
 * Конфигурация админ-панели.
 */
export interface AdminLayoutConfig {
  /** Пункты навигации */
  navItems: AdminNavItem[]
  /** Заголовок админ-панели */
  title?: string
  /** URL основного сайта (для ссылки "Открыть сайт") */
  siteUrl?: string
  /** Маппинг сегментов пути на человекочитаемые названия */
  pathNames?: Record<string, string>
  /** Базовый URL админ-панели (по умолчанию '/admin') */
  baseUrl?: string
  /** Цветовая палитра (по умолчанию 'purple') */
  colorPalette?: string
}

/**
 * Базовый тип элемента таблицы.
 */
export interface TableItem {
  id: string
  order?: number
}

/**
 * Определение колонки таблицы.
 */
export interface ColumnDef<T extends TableItem> {
  /** Заголовок колонки */
  header: string
  /** Ключ поля или функция рендеринга */
  accessor: keyof T | ((item: T) => React.ReactNode)
  /** Ширина колонки */
  width?: string
  /** Выравнивание текста */
  textAlign?: 'left' | 'center' | 'right'
  /** Стиль шрифта */
  fontFamily?: 'mono' | 'body'
  /** Размер шрифта */
  fontSize?: 'xs' | 'sm' | 'md'
  /** Вес шрифта */
  fontWeight?: 'normal' | 'medium' | 'bold'
}

/**
 * Действие для массовых операций.
 */
export interface BulkAction {
  /** Уникальный ключ действия */
  key: string
  /** Название действия */
  label: string
  /** Иконка */
  icon?: React.ReactNode
  /** Цвет кнопки */
  colorPalette?: 'purple' | 'green' | 'red' | 'gray' | 'blue'
  /** Callback при выполнении */
  onExecute?: (ids: string[]) => Promise<void>
  /** Требуется подтверждение */
  requiresConfirmation?: boolean
  /** Callback от таблицы (для handleBulkAction) */
  onClick?: (ids: string[]) => Promise<void>
}

/**
 * Тип статуса для StatusBadge.
 */
export type StatusType = 'published' | 'inStock' | 'order'

/**
 * Опция фильтра.
 */
export interface FilterOption {
  value: string
  label: string
}
