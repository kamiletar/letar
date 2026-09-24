'use client'

import { Box, HStack, Progress, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'

interface QuizProgressBarProps {
  current: number
  total: number
  answered: number
  /** Глобальный прогресс (все сессии) */
  globalProgress?: {
    totalAnswered: number
    totalQuestions: number
  }
}

export function QuizProgressBar({ current, total, answered, globalProgress }: QuizProgressBarProps) {
  const t = useTranslations('quiz')
  const tp = useTranslations('quiz.progressBar')

  // Глобальный процент покрытия
  const globalPercent = globalProgress
    ? Math.round((globalProgress.totalAnswered / globalProgress.totalQuestions) * 1000) / 10
    : null

  return (
    <Box w="100%">
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" color="fg.muted">
          {t('progress', { current: current + 1, total })}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {t('answered', { count: answered })}
        </Text>
      </HStack>
      <Progress.Root value={(answered / total) * 100} size="sm" colorPalette="brand">
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>

      {/* Глобальный прогресс */}
      {globalProgress && (
        <HStack justify="space-between" mt={2}>
          <Text fontSize="xs" color="fg.subtle">
            {tp('total', {
              totalAnswered: globalProgress.totalAnswered,
              totalQuestions: globalProgress.totalQuestions,
            })}
          </Text>
          <Text fontSize="xs" color="brand.fg" fontWeight="bold">
            {globalPercent}%
          </Text>
        </HStack>
      )}
    </Box>
  )
}
