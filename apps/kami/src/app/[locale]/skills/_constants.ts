import { Code, Monitor, Server, Users, Wrench } from 'lucide-react'
import { createElement } from 'react'

/**
 * Маппинг иконок категорий навыков
 */
export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Monitor: createElement(Monitor, { size: 20 }),
  Server: createElement(Server, { size: 20 }),
  Wrench: createElement(Wrench, { size: 20 }),
  Users: createElement(Users, { size: 20 }),
  Code: createElement(Code, { size: 20 }),
}

/**
 * Цвета для уровней навыков
 */
export const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: 'gray',
  INTERMEDIATE: 'blue',
  ADVANCED: 'purple',
  EXPERT: 'green',
}

/**
 * Локализованные названия уровней
 */
export const LEVEL_NAMES: Record<string, { ru: string; en: string }> = {
  BEGINNER: { ru: 'Начинающий', en: 'Beginner' },
  INTERMEDIATE: { ru: 'Средний', en: 'Intermediate' },
  ADVANCED: { ru: 'Продвинутый', en: 'Advanced' },
  EXPERT: { ru: 'Эксперт', en: 'Expert' },
}
