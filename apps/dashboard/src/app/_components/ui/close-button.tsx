'use client'

import { IconButton, type IconButtonProps } from '@chakra-ui/react'
import { forwardRef } from 'react'
import { LuX } from 'react-icons/lu'

export type CloseButtonProps = IconButtonProps

export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(function CloseButton(props, ref) {
  return (
    <IconButton variant="ghost" aria-label="Close" ref={ref} {...props}>
      {props.children ?? <LuX />}
    </IconButton>
  )
})
