'use client'

import { Alert, Box, Button, CloseButton, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useState } from 'react'
import { LuArrowRight, LuSparkles } from 'react-icons/lu'

interface OnboardingReminderProps {
  /** Текущий шаг онбординга (1-6) */
  currentStep: number
  /** Массив завершённых шагов */
  completedSteps: number[]
  /** Был ли онбординг пропущен */
  wasSkipped: boolean
  /** Дата пропуска онбординга */
  skippedAt?: Date | null
}

export function OnboardingReminder({ currentStep, completedSteps, wasSkipped, skippedAt }: OnboardingReminderProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) {
    return null
  }

  const totalSteps = 6
  const progress = Math.round((completedSteps.length / totalSteps) * 100)

  // Определяем сообщение в зависимости от ситуации
  const getMessage = () => {
    if (wasSkipped && skippedAt) {
      const daysSinceSkipped = Math.floor((Date.now() - new Date(skippedAt).getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceSkipped === 0) {
        return 'Вы пропустили настройку профиля. Заполните его, чтобы ученики могли вас найти.'
      } else if (daysSinceSkipped === 1) {
        return 'Вчера вы пропустили настройку профиля. Давайте завершим её сейчас!'
      } else if (daysSinceSkipped < 7) {
        return `Прошло ${daysSinceSkipped} дней с момента пропуска настройки. Ученики пока не могут вас найти.`
      } else {
        return 'Ваш профиль всё ещё не заполнен. Без него вы не появитесь в каталоге инструкторов.'
      }
    }

    if (currentStep <= 1) {
      return 'Добро пожаловать! Настройте профиль, чтобы ученики могли вас найти.'
    }

    if (progress < 50) {
      return `Вы на ${progress}% завершили настройку профиля. Осталось совсем немного!`
    }

    return `Осталось ${totalSteps - completedSteps.length} шага до полной настройки профиля.`
  }

  const getStepLabel = () => {
    const stepLabels = ['Приветствие', 'Профиль', 'Автомобиль', 'Расписание', 'Цены', 'Завершение']
    return stepLabels[currentStep - 1] || stepLabels[0]
  }

  return (
    <Alert.Root status="info" variant="subtle" borderRadius="lg">
      <HStack justify="space-between" w="full" flexWrap={{ base: 'wrap', md: 'nowrap' }} gap={4}>
        <HStack gap={3} flex={1}>
          <Alert.Indicator>
            <LuSparkles />
          </Alert.Indicator>
          <VStack align="start" gap={1} flex={1}>
            <Alert.Title fontWeight="medium">
              {wasSkipped ? 'Завершите настройку профиля' : 'Настройка профиля'}
            </Alert.Title>
            <Alert.Description>
              <Text fontSize="sm" color="fg.muted">
                {getMessage()}
              </Text>
            </Alert.Description>
            <Box w="full" maxW="200px" mt={1}>
              <Progress.Root value={progress} size="xs" colorPalette="brand">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
              <Text fontSize="xs" color="fg.muted" mt={1}>
                {progress}% завершено (шаг {currentStep}: {getStepLabel()})
              </Text>
            </Box>
          </VStack>
        </HStack>
        <HStack gap={2}>
          <Button asChild colorPalette="brand" size="sm">
            <Link href="/instructor-onboarding">
              {wasSkipped ? 'Продолжить' : 'Завершить настройку'}
              <LuArrowRight />
            </Link>
          </Button>
          <CloseButton size="sm" onClick={() => setIsDismissed(true)} aria-label="Закрыть напоминание" />
        </HStack>
      </HStack>
    </Alert.Root>
  )
}
