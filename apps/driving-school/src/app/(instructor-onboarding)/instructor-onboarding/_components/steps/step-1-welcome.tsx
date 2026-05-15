'use client'

import { Box, Button, Card, Heading, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useFormStepsContext } from '@letar/forms'
import { useCallback } from 'react'
import { LuCalendar, LuChartBar, LuClock, LuStar, LuUsers } from 'react-icons/lu'
import { InstructorFaqDialog } from '../instructor-faq-dialog'

interface Step1WelcomeProps {
  userName: string
  onSkip: () => void
  isPending: boolean
}

const features = [
  {
    icon: LuCalendar,
    title: 'Управляйте расписанием',
    description: 'Создавайте слоты и принимайте записи',
  },
  {
    icon: LuUsers,
    title: 'Принимайте учеников',
    description: 'Отвечайте на заявки и ведите учет',
  },
  {
    icon: LuStar,
    title: 'Получайте отзывы',
    description: 'Повышайте рейтинг и привлекайте учеников',
  },
  {
    icon: LuChartBar,
    title: 'Отслеживайте статистику',
    description: 'Анализируйте занятия и доход',
  },
]

/**
 * Шаг 1: Приветствие
 * Показывает обзор возможностей платформы.
 * Не содержит полей формы, только навигацию.
 */
export function Step1Welcome({ userName, onSkip, isPending }: Step1WelcomeProps) {
  const { goToNext } = useFormStepsContext()

  const handleNext = useCallback(() => {
    goToNext()
  }, [goToNext])

  return (
    <Card.Root>
      <Card.Header textAlign="center">
        <Heading size="xl" mb={2}>
          {userName ? `${userName}, добро пожаловать!` : 'Добро пожаловать!'}
        </Heading>
        <Text color="fg.muted" fontSize="lg">
          Давайте настроим ваш профиль инструктора
        </Text>
      </Card.Header>

      <Card.Body>
        <VStack gap={8}>
          {/* Возможности платформы */}
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4} w="full">
            {features.map((feature) => (
              <Box key={feature.title} p={4} borderRadius="lg" borderWidth="1px" borderColor="border" bg="bg.subtle">
                <HStack gap={3} align="start">
                  <Icon color="brand.solid" boxSize={6}>
                    <feature.icon />
                  </Icon>
                  <VStack align="start" gap={1}>
                    <Text fontWeight="medium">{feature.title}</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {feature.description}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>

          {/* Время */}
          <HStack gap={2} color="fg.muted">
            <Icon boxSize={4}>
              <LuClock />
            </Icon>
            <Text fontSize="sm">Настройка займёт около 5 минут</Text>
          </HStack>
        </VStack>
      </Card.Body>

      <Card.Footer>
        <VStack gap={4} w="full">
          <HStack justify="space-between" w="full">
            <Button variant="ghost" onClick={onSkip} disabled={isPending}>
              Пропустить и настроить позже
            </Button>
            <Button colorPalette="brand" size="lg" onClick={handleNext} loading={isPending}>
              Начать настройку
            </Button>
          </HStack>
          <InstructorFaqDialog variant="link" size="sm" />
        </VStack>
      </Card.Footer>
    </Card.Root>
  )
}
