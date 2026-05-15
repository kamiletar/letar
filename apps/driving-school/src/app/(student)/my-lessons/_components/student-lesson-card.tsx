'use client'

import { LESSON_STATUS_CONFIG } from '@/app/_components/status-badge'
import { SwipeableCard } from '@/app/_components/swipeable-card'
import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, Card, HStack, Icon, Stack, Text, Textarea, VStack } from '@chakra-ui/react'
import { useCallback, useOptimistic, useState, useTransition } from 'react'
import { LuCalendar, LuClock, LuUser, LuX } from 'react-icons/lu'

import { cancelStudentLessonAction, type StudentLesson } from '../../my-schedule/_actions/schedule.action'

type LessonStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'NEEDS_RESCHEDULE' | 'RESCHEDULED'

interface StudentLessonCardProps {
  lesson: StudentLesson
}

export function StudentLessonCard({ lesson }: StudentLessonCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showCancelReason, setShowCancelReason] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Оптимистичный статус занятия
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<LessonStatus>(lesson.status as LessonStatus)

  const statusConfig = LESSON_STATUS_CONFIG[optimisticStatus] || { label: optimisticStatus, colorPalette: 'gray' }

  // Форматирование даты и времени
  const startTime = new Date(lesson.slot.startTime)
  const endTime = new Date(lesson.slot.endTime)

  const dateStr = startTime.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const timeStr = `${startTime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endTime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`

  // Проверка, можно ли отменить (используем оптимистичный статус)
  const canCancel = optimisticStatus === 'PENDING' || optimisticStatus === 'CONFIRMED'

  const handleCancel = () => {
    if (!showCancelReason) {
      setShowCancelReason(true)
      return
    }

    startTransition(async () => {
      // Оптимистично обновляем статус
      setOptimisticStatus('CANCELLED')
      const result = await cancelStudentLessonAction(lesson.id, cancelReason || undefined)
      if (result.success) {
        toaster.success({ title: 'Занятие отменено' })
        setShowCancelReason(false)
        setCancelReason('')
      } else {
        // При ошибке статус откатится автоматически
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  // Обработчик свайпа влево (быстрая отмена без причины)
  const handleSwipeLeft = useCallback(() => {
    if (canCancel) {
      startTransition(async () => {
        // Оптимистично обновляем статус
        setOptimisticStatus('CANCELLED')
        const result = await cancelStudentLessonAction(lesson.id)
        if (result.success) {
          toaster.success({ title: 'Занятие отменено' })
        } else {
          // При ошибке статус откатится автоматически
          toaster.error({ title: 'Ошибка', description: result.error })
        }
      })
    }
  }, [canCancel, lesson.id, setOptimisticStatus])

  return (
    <SwipeableCard onSwipeLeft={handleSwipeLeft} leftLabel="Отменить" disableLeft={!canCancel} disableRight={true}>
      <Card.Root>
        <Card.Body>
          <VStack align="stretch" gap={4}>
            {/* Шапка с датой и статусом */}
            <HStack justify="space-between">
              <HStack gap={2}>
                <Icon color="fg.muted">
                  <LuCalendar />
                </Icon>
                <Text fontWeight="medium">{dateStr}</Text>
              </HStack>
              <Badge colorPalette={statusConfig.colorPalette} size="lg">
                {statusConfig.label}
              </Badge>
            </HStack>

            {/* Время */}
            <HStack gap={2}>
              <Icon color="fg.muted">
                <LuClock />
              </Icon>
              <Text>{timeStr}</Text>
            </HStack>

            {/* Инструктор */}
            <HStack gap={2}>
              <Icon color="fg.muted">
                <LuUser />
              </Icon>
              <Text>{lesson.instructor.name}</Text>
            </HStack>

            {/* Причина отмены (если отменено) */}
            {lesson.cancelReason && (
              <Box layerStyle="panel.error">
                <Text fontSize="sm" color="error.fg">
                  Причина отмены: {lesson.cancelReason}
                </Text>
              </Box>
            )}

            {/* Форма для причины отмены */}
            {showCancelReason && (
              <Box>
                <Textarea
                  placeholder="Причина отмены (необязательно)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                />
              </Box>
            )}

            {/* Кнопки действий */}
            {canCancel && (
              <Stack direction={{ base: 'column', sm: 'row' }} gap={2}>
                <Button colorPalette="red" variant="outline" size="md" onClick={handleCancel} loading={isPending}>
                  <Icon>
                    <LuX />
                  </Icon>
                  {showCancelReason ? 'Подтвердить отмену' : 'Отменить'}
                </Button>

                {showCancelReason && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setShowCancelReason(false)
                      setCancelReason('')
                    }}
                  >
                    Назад
                  </Button>
                )}
              </Stack>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </SwipeableCard>
  )
}
