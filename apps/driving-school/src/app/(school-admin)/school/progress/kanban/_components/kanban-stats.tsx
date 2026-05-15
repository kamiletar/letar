'use client'

import { Badge, HStack, Icon, Text } from '@chakra-ui/react'
import { LuUsers } from 'react-icons/lu'

import type { KanbanData } from '../_actions/kanban.action'
import { getColumnConfig, KANBAN_COLUMNS, type KanbanStage } from '../_lib/kanban-config'

interface KanbanStatsProps {
  stats: KanbanData['stats']
}

/**
 * Статистика по колонкам Kanban
 */
export function KanbanStats({ stats }: KanbanStatsProps) {
  return (
    <HStack gap={4} wrap="wrap">
      {/* Общее количество */}
      <HStack gap={2}>
        <Icon color="fg.muted">
          <LuUsers />
        </Icon>
        <Text fontSize="sm" fontWeight="medium">
          Всего: {stats.total}
        </Text>
      </HStack>

      {/* По колонкам */}
      {KANBAN_COLUMNS.map((column) => {
        const count = stats.byStage[column.id as KanbanStage]
        if (count === 0) {
          return null
        }

        const config = getColumnConfig(column.id)
        return (
          <HStack key={column.id} gap={1}>
            <Icon color={`${config.color}.fg`} fontSize="sm">
              <config.icon />
            </Icon>
            <Badge colorPalette={config.color} variant="subtle" size="sm">
              {count}
            </Badge>
          </HStack>
        )
      })}
    </HStack>
  )
}
