import {
  LuActivity,
  LuBrain,
  LuCalendar,
  LuCircle,
  LuCircleAlert,
  LuCircleCheck,
  LuClock,
  LuHeart,
  LuSparkles,
  LuTarget,
  LuUser,
} from 'react-icons/lu'
import type { ImotLevel } from './imot-colors'

/**
 * Иконки для уровней диагностики ИМОТ
 */
export const imotIcons = {
  numerology: LuSparkles,
  neuroPsych: LuBrain,
  energy: LuActivity,
  body: LuHeart,
  style: LuUser,
  integration: LuTarget,
} as const

/**
 * Получить иконку для уровня
 */
export function getLevelIcon(level: ImotLevel) {
  return imotIcons[level]
}

/**
 * Иконки для статусов
 */
export const statusIcons = {
  scheduled: LuCalendar,
  in_progress: LuClock,
  completed: LuCircleCheck,
  cancelled: LuCircle,
  warning: LuCircleAlert,
} as const

/**
 * Emoji иконки для уровней (альтернатива)
 */
export const imotEmojis = {
  numerology: '✨',
  neuroPsych: '🧠',
  energy: '⚡',
  body: '💚',
  style: '🎨',
  integration: '🎯',
} as const
