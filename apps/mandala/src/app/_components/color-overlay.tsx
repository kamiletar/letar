'use client'

import { Box } from '@chakra-ui/react'

interface ColorOverlayProps {
  duration?: number // секунды
}

export function ColorOverlay({ duration = 22 }: ColorOverlayProps) {
  return (
    <>
      <style>
        {`
          @keyframes overflowing {
            0% { background-color: #00bbff; }
            12% { background-color: rgb(5, 178, 255); }
            24% { background-color: rgb(4, 61, 255); }
            36% { background-color: rgb(255, 23, 151); }
            48% { background-color: rgb(231, 255, 0); }
            60% { background-color: rgb(0, 255, 170); }
            72% { background-color: rgb(33, 255, 27); }
            84% { background-color: white; }
            96% { background-color: #ea5a51; }
            100% { background-color: #00bbff; }
          }
        `}
      </style>
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={0}
        pointerEvents="none"
        mixBlendMode="multiply"
        animation={`overflowing ${duration}s cubic-bezier(0.64, -0.44, 0.51, 1.68) infinite`}
      />
    </>
  )
}
