'use client'

import type { LevelReading } from '@/lib/audio/level-meter'
import { Box } from '@chakra-ui/react'

interface LevelMeterBarProps {
  level: LevelReading
}

/** Горизонтальная полоса уровня: RMS — заливка, пик — тонкая метка. Красный край = перегруз. */
export function LevelMeterBar({ level }: LevelMeterBarProps) {
  const rmsPct = Math.round(level.rms * 100)
  const peakPct = Math.round(level.peak * 100)

  return (
    <Box
      position="relative"
      w="140px"
      h="10px"
      bg="#0E0C08"
      border="1px solid #2A2018"
      borderRadius="3px"
      overflow="hidden"
    >
      <Box
        position="absolute"
        inset="0"
        left={0}
        w={`${rmsPct}%`}
        bg={level.clipping ? '#e05555' : '#D4AF37'}
        transition="width 0.05s linear"
      />
      <Box
        position="absolute"
        top={0}
        bottom={0}
        left={`${Math.min(98, peakPct)}%`}
        w="2px"
        bg={level.clipping ? '#ff8080' : '#F5D85A'}
      />
    </Box>
  )
}
