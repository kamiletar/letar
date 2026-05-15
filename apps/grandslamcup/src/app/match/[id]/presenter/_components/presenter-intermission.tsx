'use client'

/**
 * Экран перерыва для ведущего.
 *
 * Показывает «Перерыв» и таймер — сколько уже прошло.
 */

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export function PresenterIntermission() {
  const [startedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <VStack gap={6} align="center" py={12} textAlign="center">
      <Heading size="4xl">⏸ Перерыв</Heading>
      <Box bg="bg.subtle" p={6} borderRadius="xl" borderWidth="2px" borderColor="border.muted">
        <Text fontSize="sm" color="fg.muted" mb={1}>
          Длительность перерыва
        </Text>
        <Text fontSize="6xl" fontWeight="bold" fontFamily="mono" color="blue.fg">
          {timeStr}
        </Text>
      </Box>
      <Text color="fg.muted">Второй тайм начнётся по сигналу счетовода</Text>
    </VStack>
  )
}
