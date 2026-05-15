'use client'

/**
 * Карточка перерыва в списке
 */

import { Box, Flex, HStack, IconButton, Text } from '@chakra-ui/react'
import { LuCalendar, LuPencil, LuRepeat, LuTrash2 } from 'react-icons/lu'

import { Tooltip } from '@letar/ui'

import type { CustomBreakData } from '../_actions/custom-breaks.action'
import { DAY_OF_WEEK_ACCUSATIVE } from './custom-breaks-constants'

interface BreakItemProps {
  /** Данные перерыва */
  breakItem: CustomBreakData
  /** Обработчик редактирования */
  onEdit: (breakItem: CustomBreakData) => void
  /** Обработчик удаления */
  onDelete: (id: string) => void
  /** Отключить кнопки (во время загрузки или редактирования другого) */
  disabled?: boolean
}

/**
 * Карточка перерыва
 */
export function BreakItem({ breakItem, onEdit, onDelete, disabled }: BreakItemProps) {
  // Форматирование даты для разового перерыва
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  return (
    <Flex align="center" justify="space-between" p={3} bg="bg.muted" borderRadius="md">
      <HStack gap={3}>
        {/* Иконка типа перерыва */}
        {breakItem.isRecurring ? (
          <Tooltip content="Повторяется каждую неделю">
            <Box color="fg.muted">
              <LuRepeat size={16} />
            </Box>
          </Tooltip>
        ) : (
          <Tooltip content="Разовый перерыв">
            <Box color="fg.muted">
              <LuCalendar size={16} />
            </Box>
          </Tooltip>
        )}

        {/* Информация о перерыве */}
        <Box>
          <Text fontWeight="medium">
            {breakItem.reason || 'Перерыв'}{' '}
            <Text as="span" color="fg.muted" fontWeight="normal">
              {breakItem.startTime} - {breakItem.endTime}
            </Text>
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {breakItem.isRecurring && breakItem.dayOfWeek
              ? DAY_OF_WEEK_ACCUSATIVE[breakItem.dayOfWeek]
              : breakItem.specificDate
                ? formatDate(breakItem.specificDate)
                : 'Разовый'}
          </Text>
        </Box>
      </HStack>

      {/* Действия */}
      <HStack gap={1}>
        <Tooltip content="Редактировать">
          <IconButton
            aria-label="Редактировать"
            size="sm"
            variant="ghost"
            onClick={() => onEdit(breakItem)}
            disabled={disabled}
          >
            <LuPencil />
          </IconButton>
        </Tooltip>
        <Tooltip content="Удалить перерыв">
          <IconButton
            aria-label="Удалить"
            size="sm"
            variant="ghost"
            colorPalette="red"
            onClick={() => onDelete(breakItem.id)}
            disabled={disabled}
          >
            <LuTrash2 />
          </IconButton>
        </Tooltip>
      </HStack>
    </Flex>
  )
}
