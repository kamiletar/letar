'use client'

import { Badge, type BadgeProps, HStack, Icon, Spinner } from '@chakra-ui/react'
import { LuCheck, LuClock } from 'react-icons/lu'

import type { SyncStatusProps } from './types'
import { useOfflineStatus } from './use-offline-status'
import { useSyncQueue } from './use-sync-queue'

/**
 * Sync queue status indicator
 *
 * Shows:
 * - Number of pending actions
 * - Spinner during synchronization
 * - "Synced" when queue is empty
 *
 * Works globally, does not require Form context.
 *
 * @example
 * ```tsx
 * import { FormSyncStatus } from '@letar/forms/offline'
 *
 * // In layout or header
 * <FormSyncStatus />
 * ```
 *
 * @example With custom settings
 * ```tsx
 * <FormSyncStatus
 *   showWhenEmpty={false}
 *   syncingLabel="Syncing..."
 *   pendingLabel={(count) => `Pending: ${count}`}
 *   syncedLabel="All synced"
 * />
 * ```
 */
export function FormSyncStatus({
  showWhenEmpty = false,
  syncingLabel = 'Syncing...',
  pendingLabel = (count: number) => `Pending: ${count}`,
  syncedLabel = 'Synced',
  colorPalette = 'blue',
  ...rest
}: SyncStatusProps & Omit<BadgeProps, 'children'>) {
  const isOffline = useOfflineStatus()
  const { pendingCount, isProcessing } = useSyncQueue()

  // Hide if online, queue empty and showWhenEmpty = false
  if (!isOffline && pendingCount === 0 && !isProcessing && !showWhenEmpty) {
    return null
  }

  // Determine what to display
  const renderContent = () => {
    // Synchronization in progress
    if (isProcessing) {
      return (
        <HStack gap={1}>
          <Spinner size="xs" />
          <span>{syncingLabel}</span>
        </HStack>
      )
    }

    // There are pending items
    if (pendingCount > 0) {
      const label = typeof pendingLabel === 'function' ? pendingLabel(pendingCount) : pendingLabel
      return (
        <HStack gap={1}>
          <Icon asChild boxSize={3}>
            <LuClock />
          </Icon>
          <span>{label}</span>
        </HStack>
      )
    }

    // All synced
    return (
      <HStack gap={1}>
        <Icon asChild boxSize={3}>
          <LuCheck />
        </Icon>
        <span>{syncedLabel}</span>
      </HStack>
    )
  }

  // Color depends on state
  const effectiveColorPalette = pendingCount > 0 ? 'orange' : isProcessing ? colorPalette : 'green'

  return (
    <Badge
      colorPalette={effectiveColorPalette}
      variant="subtle"
      data-testid="sync-status"
      data-pending-count={pendingCount}
      data-processing={isProcessing}
      {...rest}
    >
      {renderContent()}
    </Badge>
  )
}
