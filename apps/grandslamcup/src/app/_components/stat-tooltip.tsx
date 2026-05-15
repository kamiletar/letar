'use client'

/**
 * Заголовок таблицы/статистики с Chakra Tooltip.
 *
 * Используется в standings, профилях команд, рейтинге поэтов.
 */

import { Box, Portal, Text, Tooltip, VStack } from '@chakra-ui/react'

/** Заголовок колонки таблицы с тултипом */
export function TableHeader({
  label,
  tooltip,
  ...props
}: {
  label: string
  tooltip?: string
} & Record<string, unknown>) {
  if (!tooltip) {
    return (
      <Box px={3} py={2} fontWeight="bold" bg="bg.subtle" borderBottomWidth="1px" {...props}>
        {label}
      </Box>
    )
  }

  return (
    <Tooltip.Root openDelay={200} closeDelay={0}>
      <Tooltip.Trigger asChild>
        <Box
          px={3}
          py={2}
          fontWeight="bold"
          bg="bg.subtle"
          borderBottomWidth="1px"
          cursor="help"
          borderBottom="1px dashed"
          borderColor="fg.subtle"
          {...props}
        >
          {label}
        </Box>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content>
            <Tooltip.Arrow>
              <Tooltip.ArrowTip />
            </Tooltip.Arrow>
            {tooltip}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  )
}

/** Блок статистики (И: 5, В: 3, ...) с тултипом на лейбле */
export function StatBlock({
  label,
  tooltip,
  value,
  bold,
}: {
  label: string
  tooltip?: string
  value: number | string
  bold?: boolean
}) {
  const labelEl = (
    <Text fontSize="xs" color="fg.muted" cursor={tooltip ? 'help' : undefined}>
      {label}
    </Text>
  )

  return (
    <VStack gap={0}>
      {tooltip ? (
        <Tooltip.Root openDelay={200} closeDelay={0}>
          <Tooltip.Trigger asChild>{labelEl}</Tooltip.Trigger>
          <Portal>
            <Tooltip.Positioner>
              <Tooltip.Content>
                <Tooltip.Arrow>
                  <Tooltip.ArrowTip />
                </Tooltip.Arrow>
                {tooltip}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Portal>
        </Tooltip.Root>
      ) : (
        labelEl
      )}
      <Text fontSize="lg" fontWeight={bold ? 'bold' : 'semibold'}>
        {value}
      </Text>
    </VStack>
  )
}
