'use client'

import { Box, Card, HStack, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import type { IconType } from 'react-icons'
import { LuTrendingUp } from 'react-icons/lu'

type ColorPalette = 'red' | 'green' | 'yellow' | 'blue' | 'orange' | 'purple' | 'cyan' | 'teal' | 'pink' | 'gray'

export interface StatCardProps {
  /**
   * Иконка для отображения (react-icons IconType). Без иконки — простая плитка label/value
   */
  icon?: IconType
  /**
   * Подпись под значением
   */
  label: string
  /**
   * Значение для отображения (числовое или строковое)
   */
  value: number | string
  /**
   * Дополнительный текст (тренд, сравнение и т.д.)
   */
  subtext?: string
  /**
   * Цветовая палитра для иконки
   * @default 'blue'
   */
  colorPalette?: ColorPalette
  /**
   * Иконка для subtext (по умолчанию LuTrendingUp)
   */
  subtextIcon?: IconType
  /**
   * Функция форматирования значения
   * По умолчанию: toLocaleString('ru-RU') для чисел
   */
  formatValue?: (value: number | string) => string
  /**
   * Ссылка — при наличии карточка кликабельна и ведёт по указанному пути
   */
  href?: string
}

/**
 * Форматирование значения по умолчанию
 */
function defaultFormatValue(value: number | string): string {
  if (typeof value === 'number') {
    return value.toLocaleString('ru-RU')
  }
  return value
}

/**
 * Карточка статистики с иконкой и опциональным трендом
 *
 * @example
 * ```tsx
 * import { LuUsers, LuCalendarCheck } from 'react-icons/lu'
 *
 * <StatCard
 *   icon={LuUsers}
 *   label="Пользователей"
 *   value={1234}
 *   subtext="+12% за месяц"
 *   colorPalette="blue"
 * />
 *
 * <StatCard
 *   icon={LuCalendarCheck}
 *   label="Занятий"
 *   value={567}
 *   colorPalette="green"
 * />
 *
 * // Без иконки — простая плитка label/value
 * <StatCard label="Активных" value={12} />
 *
 * // Кликабельная карточка-ссылка
 * <StatCard label="Клиентов" value={42} href="/owner/clients" />
 * ```
 */
export function StatCard({
  icon,
  label,
  value,
  subtext,
  colorPalette = 'blue',
  subtextIcon = LuTrendingUp,
  formatValue = defaultFormatValue,
  href,
}: StatCardProps) {
  const IconComponent = icon
  const SubtextIcon = subtextIcon
  const content = (
    <HStack gap={4}>
      {IconComponent && (
        <Box
          p={3}
          borderRadius="lg"
          bg={`${colorPalette}.100`}
          color={`${colorPalette}.600`}
          _dark={{ bg: `${colorPalette}.900`, color: `${colorPalette}.200` }}
        >
          <IconComponent size={24} />
        </Box>
      )}
      <Box>
        <Text fontSize="2xl" fontWeight="bold">
          {formatValue(value)}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {label}
        </Text>
        {subtext && (
          <HStack fontSize="xs" color="fg.muted">
            <SubtextIcon size={12} />
            <span>{subtext}</span>
          </HStack>
        )}
      </Box>
    </HStack>
  )

  if (href) {
    return (
      <Card.Root
        asChild
        display="block"
        transitionProperty="border-color, background-color"
        transitionDuration="fast"
        _hover={{ borderColor: 'border.emphasized', bg: 'bg.emphasized' }}
      >
        <NextLink href={href}>
          <Card.Body>{content}</Card.Body>
        </NextLink>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Body>{content}</Card.Body>
    </Card.Root>
  )
}

export interface RoleStatProps {
  /**
   * Название роли/категории
   */
  label: string
  /**
   * Количество
   */
  count: number
  /**
   * Цветовая палитра
   * @default 'blue'
   */
  colorPalette?: ColorPalette
}

/**
 * Компактная статистика для отображения количества по ролям/категориям
 *
 * @example
 * ```tsx
 * <RoleStat label="Инструкторов" count={15} colorPalette="blue" />
 * <RoleStat label="Учеников" count={42} colorPalette="green" />
 * ```
 */
export function RoleStat({ label, count, colorPalette = 'blue' }: RoleStatProps) {
  return (
    <Box textAlign="center" p={4} borderRadius="lg" bg="bg.muted">
      <Text fontSize="2xl" fontWeight="bold" color={`${colorPalette}.500`}>
        {count}
      </Text>
      <Text fontSize="sm" color="fg.muted">
        {label}
      </Text>
    </Box>
  )
}
