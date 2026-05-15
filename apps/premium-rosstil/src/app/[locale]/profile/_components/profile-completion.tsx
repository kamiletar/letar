'use client'

import { useOfflineProfile } from '@/hooks/use-offline-profile'
import { Link } from '@/i18n/navigation'
import { Badge, Box, Button, Card, HStack, Icon, Progress, Skeleton, Text, VStack, Wrap } from '@chakra-ui/react'
import { FaCheck, FaChevronRight, FaCloud, FaExclamationCircle, FaSave, FaUser } from 'react-icons/fa'

/**
 * Компонент для отображения прогресса заполнения профиля.
 * Показывает процент заполнения и подсказки что ещё можно добавить.
 */
export function ProfileCompletion() {
  const { completionPercent, missingFields, isLoading, pendingSync, isSaving, saveNow } = useOfflineProfile()

  if (isLoading) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack gap={4}>
            <Skeleton height="20px" width="60%" />
            <Skeleton height="10px" width="100%" />
            <Skeleton height="16px" width="80%" />
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  const getCompletionColor = () => {
    if (completionPercent >= 80) {
      return 'green'
    }
    if (completionPercent >= 50) {
      return 'yellow'
    }
    return 'orange'
  }

  const getCompletionMessage = () => {
    if (completionPercent === 100) {
      return 'Профиль заполнен полностью! 🎉'
    }
    if (completionPercent >= 80) {
      return 'Отличный профиль! Осталось совсем немного.'
    }
    if (completionPercent >= 50) {
      return 'Хороший старт! Заполните ещё несколько полей.'
    }
    return 'Заполните профиль для персональных рекомендаций.'
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Icon as={FaUser} color="fg.muted" />
            <Text fontWeight="medium">Профиль заполнен на {completionPercent}%</Text>
          </HStack>
          {pendingSync && (
            <Badge colorPalette="orange" variant="subtle">
              <Icon as={FaExclamationCircle} mr={1} />
              Ожидает синхронизации
            </Badge>
          )}
          {!pendingSync && completionPercent > 0 && (
            <Badge colorPalette="green" variant="subtle">
              <Icon as={FaCloud} mr={1} />
              Синхронизировано
            </Badge>
          )}
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Прогресс-бар */}
          <Progress.Root value={completionPercent} size="lg" colorPalette={getCompletionColor()}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>

          {/* Сообщение */}
          <Text fontSize="sm" color="fg.muted">
            {getCompletionMessage()}
          </Text>

          {/* Недостающие поля */}
          {missingFields.length > 0 && missingFields.length <= 5 && (
            <Box>
              <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={2}>
                Можно добавить:
              </Text>
              <Wrap gap={2}>
                {missingFields.map((field) => (
                  <Badge key={field} variant="outline" colorPalette="gray" size="sm">
                    {field}
                  </Badge>
                ))}
              </Wrap>
            </Box>
          )}

          {/* Ссылки на заполнение */}
          <VStack align="stretch" gap={2}>
            {completionPercent < 100 && (
              <>
                {(!missingFields.includes('Имя') && !missingFields.includes('Телефон')) || (
                  <Button asChild variant="ghost" justifyContent="space-between" size="sm">
                    <Link href="/profile/edit">
                      Личные данные
                      <Icon as={FaChevronRight} />
                    </Link>
                  </Button>
                )}
                {missingFields.some((f) => ['Обхват груди', 'Обхват талии', 'Обхват бёдер', 'Пол'].includes(f)) && (
                  <Button asChild variant="ghost" justifyContent="space-between" size="sm">
                    <Link href="/profile/measurements">
                      Мерки
                      <Icon as={FaChevronRight} />
                    </Link>
                  </Button>
                )}
                {missingFields.includes('Адрес доставки') && (
                  <Button asChild variant="ghost" justifyContent="space-between" size="sm">
                    <Link href="/profile/addresses">
                      Адреса доставки
                      <Icon as={FaChevronRight} />
                    </Link>
                  </Button>
                )}
              </>
            )}
          </VStack>

          {/* Кнопка сохранения для оффлайн */}
          {pendingSync && (
            <Button size="sm" variant="outline" onClick={saveNow} loading={isSaving}>
              <Icon as={FaSave} mr={2} />
              Сохранить оффлайн
            </Button>
          )}

          {/* Успех при полном заполнении */}
          {completionPercent === 100 && (
            <HStack gap={2} color="green.500">
              <Icon as={FaCheck} />
              <Text fontSize="sm" fontWeight="medium">
                Вы получите лучшие рекомендации по размерам!
              </Text>
            </HStack>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
