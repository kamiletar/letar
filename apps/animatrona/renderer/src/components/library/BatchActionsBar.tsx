'use client'

import { Box, Button, HStack, Icon, Menu, Portal, Spinner, Text } from '@chakra-ui/react'
import { LuCheck, LuChevronDown, LuPin, LuSquareCheck, LuX } from 'react-icons/lu'

import type { WatchStatus } from '@/generated/prisma'

import { STATUS_ORDER, WATCH_STATUS_CONFIG } from './WatchStatusSelector'

interface BatchActionsBarProps {
  selectedCount: number
  totalCount: number
  isBatchUpdating: boolean
  batchProgress?: { current: number; total: number; animeName: string } | null
  onSelectAll: () => void
  onClearSelection: () => void
  onBatchWatchStatus: (status: WatchStatus) => void
  onBatchUnpin: () => void
}

export function BatchActionsBar({
  selectedCount,
  totalCount,
  isBatchUpdating,
  onSelectAll,
  onClearSelection,
  batchProgress,
  onBatchWatchStatus,
  onBatchUnpin,
}: BatchActionsBarProps) {
  return (
    <Box
      position="sticky"
      top={0}
      zIndex={20}
      bg="bg.panel"
      borderBottom="1px solid"
      borderColor="border.subtle"
      px={4}
      py={2}
      mx={-4}
    >
      {/* Прогресс пакетной операции */}
      {batchProgress && batchProgress.total > 0 && (
        <HStack gap={2} mb={2}>
          <Spinner size="xs" color="purple.400" />
          <Text fontSize="xs" color="fg.muted">
            {batchProgress.current}/{batchProgress.total} — {batchProgress.animeName}
          </Text>
        </HStack>
      )}
      <HStack gap={3} flexWrap="wrap">
        {/* Счётчик и управление выбором */}
        <HStack gap={2}>
          <Text fontSize="sm" fontWeight="semibold" color="purple.400">
            Выбрано: {selectedCount}
          </Text>
          <Button size="xs" variant="ghost" onClick={onSelectAll} disabled={isBatchUpdating}>
            <Icon as={LuSquareCheck} />
            Все ({totalCount})
          </Button>
          <Button size="xs" variant="ghost" onClick={onClearSelection} disabled={isBatchUpdating}>
            <Icon as={LuX} />
            Отмена
          </Button>
        </HStack>

        {selectedCount > 0 && (
          <>
            {/* Смена статуса просмотра */}
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button size="sm" variant="outline" colorPalette="purple" disabled={isBatchUpdating}>
                  {isBatchUpdating ? <Spinner size="xs" /> : <Icon as={LuCheck} />}
                  Статус просмотра
                  <Icon as={LuChevronDown} />
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content minW="180px">
                    {STATUS_ORDER.map((status) => {
                      const cfg = WATCH_STATUS_CONFIG[status]
                      return (
                        <Menu.Item key={status} value={status} onClick={() => onBatchWatchStatus(status)}>
                          <Icon as={cfg.icon} color={cfg.color} />
                          {cfg.label}
                        </Menu.Item>
                      )
                    })}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>

            {/* Распин */}
            <Button size="sm" variant="outline" colorPalette="orange" onClick={onBatchUnpin} disabled={isBatchUpdating}>
              {isBatchUpdating ? <Spinner size="xs" /> : <Icon as={LuPin} />}
              Открепить
            </Button>
          </>
        )}
      </HStack>
    </Box>
  )
}
