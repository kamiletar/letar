'use client'

/**
 * Переиспользуемое подменю статуса просмотра для dropdown меню
 *
 * Используется в:
 * - ActionMenu (страница деталей аниме)
 * - AnimeCard (сетка библиотеки)
 */

import { Icon, Menu, Portal } from '@chakra-ui/react'
import { LuCheck, LuChevronRight } from 'react-icons/lu'

import type { WatchStatus } from '@/generated/prisma'

import { STATUS_ORDER, WATCH_STATUS_CONFIG } from './WatchStatusSelector'

export interface WatchStatusSubmenuProps {
  /** Текущий статус просмотра */
  watchStatus: WatchStatus
  /** Callback для изменения статуса */
  onWatchStatusChange: (status: WatchStatus) => void
}

/**
 * Подменю для выбора статуса просмотра
 * Вложенное меню с 6 статусами и галочкой напротив текущего
 */
export function WatchStatusSubmenu({ watchStatus, onWatchStatusChange }: WatchStatusSubmenuProps) {
  const currentStatus = WATCH_STATUS_CONFIG[watchStatus]

  return (
    <Menu.Root positioning={{ placement: 'right-start', gutter: 2 }}>
      <Menu.TriggerItem>
        <Icon as={currentStatus.icon} color={currentStatus.color} />
        {currentStatus.label}
        <Icon as={LuChevronRight} ml="auto" />
      </Menu.TriggerItem>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="180px">
            {STATUS_ORDER.map((status) => {
              const config = WATCH_STATUS_CONFIG[status]
              const isActive = watchStatus === status
              return (
                <Menu.Item
                  key={status}
                  value={status}
                  onClick={() => onWatchStatusChange(status)}
                  fontWeight={isActive ? 'semibold' : 'normal'}
                  color={isActive ? config.color : undefined}
                >
                  <Icon as={config.icon} color={config.color} />
                  {config.label}
                  {isActive && <Icon as={LuCheck} ml="auto" />}
                </Menu.Item>
              )
            })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
