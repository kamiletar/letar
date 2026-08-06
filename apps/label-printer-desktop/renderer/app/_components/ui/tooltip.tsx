'use client'

import { Portal, Tooltip as ChakraTooltip, type TooltipRootProps } from '@chakra-ui/react'
import { forwardRef, type ReactNode, type RefObject } from 'react'

export interface TooltipProps extends TooltipRootProps {
  showArrow?: boolean
  portalled?: boolean
  portalRef?: RefObject<HTMLElement | null>
  content: ReactNode
  contentProps?: ChakraTooltip.ContentProps
  disabled?: boolean
}

/**
 * Tooltip компонент для подсказок
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(props, ref) {
  const { showArrow, children, disabled, portalled = true, content, contentProps, portalRef, ...rest } = props

  if (disabled) {
    return children
  }

  return (
    <ChakraTooltip.Root {...rest}>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal disabled={!portalled} container={portalRef}>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content ref={ref} {...contentProps}>
            {showArrow && (
              <ChakraTooltip.Arrow>
                <ChakraTooltip.ArrowTip />
              </ChakraTooltip.Arrow>
            )}
            {content}
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  )
})
