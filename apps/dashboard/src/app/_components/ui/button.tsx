'use client'

import { Button as ChakraButton, type ButtonProps as ChakraButtonProps } from '@chakra-ui/react'
import { forwardRef } from 'react'

export type ButtonProps = ChakraButtonProps

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return <ChakraButton ref={ref} {...props} />
})

Button.displayName = 'Button'
