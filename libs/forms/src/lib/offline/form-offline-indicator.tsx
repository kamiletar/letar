'use client'

import { Badge, type BadgeProps, HStack, Icon } from '@chakra-ui/react'
import { LuWifiOff } from 'react-icons/lu'

import type { OfflineIndicatorProps } from './types'
import { useOfflineStatus } from './use-offline-status'

/**
 * Offline mode indicator
 *
 * Automatically shown when the browser is offline.
 * Hidden when connection is restored.
 *
 * @example
 * ```tsx
 * import { Form } from '@letar/forms'
 *
 * <Form initialValue={data} onSubmit={handleSubmit}>
 *   <Form.OfflineIndicator />
 *   <Form.Field.String name="title" />
 *   <Form.Button.Submit />
 * </Form>
 * ```
 *
 * @example With custom settings
 * ```tsx
 * <Form.OfflineIndicator
 *   label="No connection"
 *   colorPalette="red"
 *   variant="solid"
 * />
 * ```
 */
export function FormOfflineIndicator({
  label = 'Offline mode',
  colorPalette = 'orange',
  variant = 'subtle',
  ...rest
}: OfflineIndicatorProps & Omit<BadgeProps, 'children'>) {
  const isOffline = useOfflineStatus()

  if (!isOffline) {
    return null
  }

  return (
    <Badge colorPalette={colorPalette} variant={variant} data-testid="offline-indicator" {...rest}>
      <HStack gap={1}>
        <Icon asChild boxSize={3}>
          <LuWifiOff />
        </Icon>
        <span>{label}</span>
      </HStack>
    </Badge>
  )
}
