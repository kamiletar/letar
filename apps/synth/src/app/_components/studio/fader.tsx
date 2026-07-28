'use client'

import { Box, Text } from '@chakra-ui/react'

interface FaderProps {
  value: number // 0-127
  label: string
  height?: number
}

// Визуальный слепок физического линейного фейдера (только отображение — не интерактивный,
// в отличие от Knob; реальное управление идёт с самого железа, см. HardwarePanel)
export function Fader({ value, label, height = 90 }: FaderProps) {
  const norm = Math.max(0, Math.min(1, value / 127))
  const fillH = norm * height

  return (
    <Box display="flex" flexDir="column" alignItems="center" gap="4px">
      <Box
        position="relative"
        w="16px"
        h={`${height}px`}
        bg="#0E0C08"
        border="1px solid #2A2018"
        borderRadius="3px"
        overflow="hidden"
      >
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          h={`${fillH}px`}
          bg="#D4AF37"
          transition="height 0.05s linear"
        />
        <Box
          position="absolute"
          left="-2px"
          right="-2px"
          h="3px"
          bg="#EEC835"
          bottom={`${Math.max(0, fillH - 1.5)}px`}
          borderRadius="2px"
          boxShadow="0 0 4px #EEC83588"
        />
      </Box>
      <Text fontSize="8px" color="fg.subtle" letterSpacing="0.04em" textTransform="uppercase" textAlign="center">
        {label}
      </Text>
      <Text fontSize="8px" color="fg.gold" letterSpacing="0.03em">
        {Math.round(norm * 100)}%
      </Text>
    </Box>
  )
}
