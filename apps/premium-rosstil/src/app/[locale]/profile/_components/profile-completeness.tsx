'use client'

import { Box, Card, Heading, HStack, List, Progress, Text, VStack } from '@chakra-ui/react'
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

interface ProfileCompletenessProps {
  name: string | null
  email: string | null
  phoneNumber: string | null
  gender: string | null
  birthdate: Date | null
  image: string | null
  measurements: {
    bust: number | null
    waist: number | null
    hips: number | null
    height: number | null
    preferredSize: string | null
  } | null
}

interface FieldStatus {
  label: string
  completed: boolean
}

/**
 * Компонент отображения прогресса заполнения профиля.
 * Показывает процент заполненности и список полей со статусом.
 */
export function ProfileCompleteness({
  name,
  email,
  phoneNumber,
  gender,
  birthdate,
  image,
  measurements,
}: ProfileCompletenessProps) {
  // Определяем статус каждого поля
  const fields: FieldStatus[] = [
    { label: 'Имя', completed: !!name },
    { label: 'Email', completed: !!email },
    { label: 'Телефон', completed: !!phoneNumber },
    { label: 'Пол', completed: !!gender },
    { label: 'Дата рождения', completed: !!birthdate },
    { label: 'Фото профиля', completed: !!image },
    { label: 'Обхват груди', completed: !!measurements?.bust },
    { label: 'Обхват талии', completed: !!measurements?.waist },
    { label: 'Обхват бедер', completed: !!measurements?.hips },
    { label: 'Рост', completed: !!measurements?.height },
    { label: 'Размер', completed: !!measurements?.preferredSize },
  ]

  // Рассчитываем процент заполненности
  const completedCount = fields.filter((f) => f.completed).length
  const totalCount = fields.length
  const percentage = Math.round((completedCount / totalCount) * 100)

  // Определяем цвет прогресс-бара
  const getColorPalette = () => {
    if (percentage === 100) {
      return 'green'
    }
    if (percentage >= 70) {
      return 'blue'
    }
    if (percentage >= 40) {
      return 'yellow'
    }
    return 'red'
  }

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md" textTransform="none">
          Заполненность профиля
        </Heading>
      </Card.Header>

      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Progress Bar */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" color="fg.muted">
                {completedCount} из {totalCount} полей заполнено
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color={`${getColorPalette()}.500`}>
                {percentage}%
              </Text>
            </HStack>

            <Progress.Root value={percentage} colorPalette={getColorPalette()} size="lg">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>

          {/* Fields List */}
          {percentage < 100 && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
                Заполните профиль полностью:
              </Text>
              <List.Root gap={2} variant="plain">
                {fields.map((field) => (
                  <List.Item key={field.label}>
                    <HStack gap={2}>
                      <Box
                        as={field.completed ? FaCheckCircle : FaTimesCircle}
                        color={field.completed ? 'green.500' : 'gray.400'}
                        fontSize="sm"
                      />
                      <Text
                        fontSize="sm"
                        color={field.completed ? 'fg' : 'fg.muted'}
                        textDecoration={field.completed ? 'none' : 'none'}
                      >
                        {field.label}
                      </Text>
                    </HStack>
                  </List.Item>
                ))}
              </List.Root>
            </Box>
          )}

          {/* Success Message */}
          {percentage === 100 && (
            <Box p={3} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
              <HStack gap={2}>
                <FaCheckCircle color="green" />
                <Text fontSize="sm" color="green.700" fontWeight="medium">
                  Отлично! Ваш профиль заполнен на 100%
                </Text>
              </HStack>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
