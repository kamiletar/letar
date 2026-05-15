'use client'

/**
 * ExpirationIndicator — индикатор срока действия документа (v0.205.0)
 *
 * Состояния:
 * - null → "Бессрочный" (серый)
 * - >30 дней → "До 15.03.2027" (зелёный)
 * - 7-30 дней → "Истекает через 14 дней" (оранжевый)
 * - <7 дней → "Истекает через 3 дня" (красный, pulse)
 * - <0 дней → "ИСТЁК 5 дней назад" (красный badge)
 */

import { Badge, type BadgeProps, Box, Icon, Text } from '@chakra-ui/react'
import { differenceInDays, format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { LuCheck, LuClock, LuInfinity, LuTriangleAlert, LuX } from 'react-icons/lu'

export interface ExpirationIndicatorProps extends Omit<BadgeProps, 'colorPalette'> {
  /** Дата истечения срока действия. NULL = бессрочный */
  expiresAt: Date | string | null
  /** За сколько дней до истечения показывать предупреждение (default: 30) */
  warningDays?: number
  /** За сколько дней до истечения показывать критическое предупреждение (default: 7) */
  criticalDays?: number
  /** Формат даты для отображения (default: 'dd.MM.yyyy') */
  dateFormat?: string
  /** Показывать компактный вид (только badge без текста) */
  compact?: boolean
  /** Показывать иконку */
  showIcon?: boolean
}

/**
 * Получить состояние истечения
 */
function getExpirationState(expiresAt: Date | null, warningDays: number, criticalDays: number) {
  if (!expiresAt) {
    return {
      status: 'permanent' as const,
      colorPalette: 'gray' as const,
      icon: LuInfinity,
      label: 'Бессрочный',
      daysRemaining: null,
    }
  }

  const now = new Date()
  const daysRemaining = differenceInDays(expiresAt, now)

  if (daysRemaining < 0) {
    return {
      status: 'expired' as const,
      colorPalette: 'red' as const,
      icon: LuX,
      label: `Истёк ${formatDistanceToNow(expiresAt, { locale: ru, addSuffix: true })}`,
      daysRemaining,
    }
  }

  if (daysRemaining <= criticalDays) {
    return {
      status: 'critical' as const,
      colorPalette: 'red' as const,
      icon: LuTriangleAlert,
      label:
        daysRemaining === 0 ? 'Истекает сегодня' : `Истекает через ${daysRemaining} ${pluralizeDays(daysRemaining)}`,
      daysRemaining,
    }
  }

  if (daysRemaining <= warningDays) {
    return {
      status: 'warning' as const,
      colorPalette: 'orange' as const,
      icon: LuClock,
      label: `Истекает через ${daysRemaining} ${pluralizeDays(daysRemaining)}`,
      daysRemaining,
    }
  }

  return {
    status: 'valid' as const,
    colorPalette: 'green' as const,
    icon: LuCheck,
    label: `До ${format(expiresAt, 'dd.MM.yyyy')}`,
    daysRemaining,
  }
}

/**
 * Склонение слова "день"
 */
function pluralizeDays(count: number): string {
  const absCount = Math.abs(count)
  const lastDigit = absCount % 10
  const lastTwoDigits = absCount % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'дней'
  }

  if (lastDigit === 1) {
    return 'день'
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня'
  }

  return 'дней'
}

/**
 * Компонент индикатора срока действия документа
 *
 * @example
 * // Бессрочный документ
 * <ExpirationIndicator expiresAt={null} />
 *
 * // Документ с датой истечения
 * <ExpirationIndicator expiresAt={new Date('2025-06-15')} />
 *
 * // Компактный вид
 * <ExpirationIndicator expiresAt={expiresAt} compact />
 *
 * // Кастомные пороги
 * <ExpirationIndicator expiresAt={expiresAt} warningDays={60} criticalDays={14} />
 */
export function ExpirationIndicator({
  expiresAt,
  warningDays = 30,
  criticalDays = 7,
  // dateFormat зарезервирован для будущего использования
  dateFormat: _dateFormat = 'dd.MM.yyyy',
  compact = false,
  showIcon = true,
  ...badgeProps
}: ExpirationIndicatorProps) {
  // Преобразуем строку в Date если нужно
  const expiresAtDate = expiresAt ? (typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt) : null

  const state = getExpirationState(expiresAtDate, warningDays, criticalDays)

  // Анимация для критического состояния
  const pulseAnimation = state.status === 'critical' ? { animation: 'pulse 2s ease-in-out infinite' } : {}

  if (compact) {
    return (
      <Badge colorPalette={state.colorPalette} css={pulseAnimation} {...badgeProps}>
        {showIcon && (
          <Icon boxSize={3}>
            <state.icon />
          </Icon>
        )}
        {state.daysRemaining !== null && state.daysRemaining >= 0 ? state.daysRemaining : '!'}
      </Badge>
    )
  }

  return (
    <Badge
      colorPalette={state.colorPalette}
      css={pulseAnimation}
      display="inline-flex"
      alignItems="center"
      gap={1}
      {...badgeProps}
    >
      {showIcon && (
        <Icon boxSize={3}>
          <state.icon />
        </Icon>
      )}
      <Text as="span">{state.label}</Text>
    </Badge>
  )
}

/**
 * Получить информацию о состоянии истечения для использования в логике
 */
export function useExpirationState(expiresAt: Date | string | null, warningDays = 30, criticalDays = 7) {
  const expiresAtDate = expiresAt ? (typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt) : null

  return getExpirationState(expiresAtDate, warningDays, criticalDays)
}

/**
 * Проверка, требует ли документ внимания (предупреждение или истёк)
 */
export function needsAttention(expiresAt: Date | string | null, warningDays = 30): boolean {
  if (!expiresAt) {
    return false
  }

  const expiresAtDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const daysRemaining = differenceInDays(expiresAtDate, new Date())

  return daysRemaining <= warningDays
}

/**
 * Инлайновое отображение срока действия с иконкой
 */
export function ExpirationInline({
  expiresAt,
  warningDays = 30,
  criticalDays = 7,
}: {
  expiresAt: Date | string | null
  warningDays?: number
  criticalDays?: number
}) {
  const expiresAtDate = expiresAt ? (typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt) : null

  const state = getExpirationState(expiresAtDate, warningDays, criticalDays)

  const colorMap = {
    permanent: 'fg.muted',
    valid: 'green.fg',
    warning: 'orange.fg',
    critical: 'red.fg',
    expired: 'red.fg',
  } as const

  return (
    <Box display="inline-flex" alignItems="center" gap={1} color={colorMap[state.status]}>
      <Icon boxSize={4}>
        <state.icon />
      </Icon>
      <Text as="span" fontSize="sm">
        {state.label}
      </Text>
    </Box>
  )
}

/**
 * Статусы документов с конфигурацией для StatusBadge
 */
export const DOCUMENT_STATUS_CONFIG = {
  PENDING: {
    label: 'Ожидает загрузки',
    colorPalette: 'gray' as const,
    icon: LuClock,
  },
  UPLOADED: {
    label: 'На проверке',
    colorPalette: 'blue' as const,
    icon: LuClock,
  },
  APPROVED: {
    label: 'Одобрен',
    colorPalette: 'green' as const,
    icon: LuCheck,
  },
  REJECTED: {
    label: 'Отклонён',
    colorPalette: 'red' as const,
    icon: LuX,
  },
  EXPIRED: {
    label: 'Истёк',
    colorPalette: 'red' as const,
    icon: LuTriangleAlert,
  },
} as const
