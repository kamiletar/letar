'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

const CONFETTI = ['🎉', '🎊', '✨', '🌟', '⭐', '🎆', '🎇', '💫']

/**
 * Анимация празднования юбилейного UNIX-часа
 */
export function Celebration({ milestoneHour }: { milestoneHour: number }) {
  const t = useTranslations('celebration')
  const [particles, setParticles] = useState<Array<{ id: number; emoji: string; left: number; delay: number }>>([])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Генерируем частицы конфетти
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji: CONFETTI[i % CONFETTI.length],
      left: Math.random() * 100,
      delay: Math.random() * 3,
    }))
    setParticles(items)

    // Скрыть через 5 минут
    const timer = setTimeout(() => {
      setVisible(false)
    }, 300_000)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) {
    return null
  }

  const milestoneFormatted = milestoneHour.toLocaleString()

  return (
    <Box pos="fixed" inset={0} zIndex={20} pointerEvents="none">
      {/* Конфетти */}
      {particles.map((p) => (
        <Box
          key={p.id}
          pos="absolute"
          left={`${p.left}%`}
          bottom={0}
          fontSize="2rem"
          animation={`confetti-float 4s ease-out ${p.delay}s forwards`}
        >
          {p.emoji}
        </Box>
      ))}

      {/* Текст юбилея */}
      <VStack pos="absolute" top="15%" left="50%" transform="translateX(-50%)" textAlign="center" gap={2}>
        <Text
          fontSize={{ base: '5vmin', md: '6vmin' }}
          fontWeight="300"
          letterSpacing="0.1em"
          animation="celebration-pulse 2s ease-in-out infinite"
        >
          🎉
        </Text>
        <Text fontSize={{ base: '3vmin', md: '3.5vmin' }} fontWeight="300" letterSpacing="0.08em">
          {t('milestone', { hours: milestoneFormatted })}
        </Text>
      </VStack>
    </Box>
  )
}
