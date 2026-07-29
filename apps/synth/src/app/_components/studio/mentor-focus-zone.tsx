'use client'

import { Box, type BoxProps } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'

interface MentorFocusZoneProps extends BoxProps {
  /** Подсвечена ли зона сейчас (MCP-инструмент focus_section) */
  active: boolean
}

/** Оборачивает блок студии — при активации подсвечивает золотой рамкой и скроллит к нему */
export function MentorFocusZone({ active, children, ...props }: MentorFocusZoneProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [active])

  return (
    <Box
      ref={ref}
      borderRadius="lg"
      transition="box-shadow 0.3s ease, border-color 0.3s ease"
      border="1px solid"
      borderColor={active ? 'accent.DEFAULT' : 'transparent'}
      boxShadow={active ? '0 0 0 1px rgba(212,175,55,0.4), 0 0 20px rgba(212,175,55,0.25)' : 'none'}
      {...props}
    >
      {children}
    </Box>
  )
}
