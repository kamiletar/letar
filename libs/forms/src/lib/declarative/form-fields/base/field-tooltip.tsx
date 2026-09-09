'use client'

import { Box, Circle, Portal, Text, Tooltip as ChakraTooltip, VStack } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { LuCircleHelp } from 'react-icons/lu'
import type { FieldTooltipMeta } from '../../types'

export type FieldTooltipProps = FieldTooltipMeta

/**
 * Tooltip component for form fields.
 * Shows a "?" icon with a popup hint on hover.
 *
 * @example
 * ```tsx
 * <FieldTooltip
 *   description="Specify the brand of your training car"
 *   example="Hyundai, Kia, Volkswagen"
 *   impact="Students often search for instructor by car brand"
 * />
 * ```
 */
export function FieldTooltip({ title, description, example, impact }: FieldTooltipProps): ReactElement {
  return (
    <ChakraTooltip.Root openDelay={200} positioning={{ placement: 'top' }}>
      <ChakraTooltip.Trigger asChild>
        <Circle
          size="5"
          cursor="help"
          color="fg.muted"
          _hover={{ color: 'colorPalette.fg' }}
          transition="color 0.2s"
          display="inline-flex"
        >
          <LuCircleHelp size={16} />
        </Circle>
      </ChakraTooltip.Trigger>
      <Portal>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content>
            <ChakraTooltip.Arrow>
              <ChakraTooltip.ArrowTip />
            </ChakraTooltip.Arrow>
            <VStack align="start" gap={2} maxW="280px" p={1}>
              {title && (
                <Text fontWeight="semibold" fontSize="sm">
                  {title}
                </Text>
              )}
              <Text fontSize="sm">{description}</Text>
              {example && (
                <Box bg="bg.emphasized" px={2} py={1} borderRadius="md" w="full">
                  <Text fontSize="xs" color="fg.muted">
                    Example:
                  </Text>
                  <Text fontSize="sm" fontStyle="italic">
                    &quot;{example}&quot;
                  </Text>
                </Box>
              )}
              {impact && (
                // Tooltip.Content всегда рисуется на `bg.inverted` (белый в тёмной теме,
                // тёмный в светлой — контраст с текущей темой страницы, не с ней самой).
                // Обычный `green.fg` — по мысли для обычной, не инвертированной поверхности:
                // в тёмной теме он резолвится в светло-зелёный и на белом фоне тултипа почти
                // не читается. Инвертируем вручную, той же логикой, что и сама поверхность.
                <Text fontSize="xs" color={{ _light: 'green.300', _dark: 'green.700' }}>
                  {impact}
                </Text>
              )}
            </VStack>
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  )
}
