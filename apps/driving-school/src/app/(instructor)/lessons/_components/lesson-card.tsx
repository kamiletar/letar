'use client'

import { LESSON_STATUS_CONFIG, StatusBadge } from '@/app/_components/status-badge'
import { SwipeableCard } from '@/app/_components/swipeable-card'
import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Card, HStack, Icon, Stack, Text, Textarea, VStack } from '@chakra-ui/react'
import { useCallback, useMemo, useOptimistic, useState, useTransition } from 'react'
import { LuCalendar, LuCheck, LuClock, LuUser, LuX } from 'react-icons/lu'
import {
  cancelLessonAction,
  completeLessonAction,
  confirmLessonAction,
  type LessonWithDetails,
  markNoShowAction,
} from '../_actions/lesson.action'

type LessonStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'NEEDS_RESCHEDULE' | 'RESCHEDULED'

interface LessonCardProps {
  lesson: LessonWithDetails
}

export function LessonCard({ lesson }: LessonCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [showCancelReason, setShowCancelReason] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Оптимистичный статус занятия
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<LessonStatus>(lesson.status as LessonStatus)

  // Форматирование даты и времени (мемоизируем чтобы не пересоздавать на каждый рендер)
  const startTime = useMemo(() => new Date(lesson.slot.startTime), [lesson.slot.startTime])
  const endTime = useMemo(() => new Date(lesson.slot.endTime), [lesson.slot.endTime])

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

  // Проверка, можно ли выполнять действия (используем оптимистичный статус)
  const canConfirm = optimisticStatus === 'PENDING'
  const canCancel = optimisticStatus === 'PENDING' || optimisticStatus === 'CONFIRMED'
  const canComplete = optimisticStatus === 'CONFIRMED'
  const isPast = startTime < new Date()

  // Обработчики действий с оптимистичными обновлениями
  const handleConfirm = () => {
    startTransition(async () => {
      // Оптимистично обновляем статус
      setOptimisticStatus('CONFIRMED')
      const result = await confirmLessonAction(lesson.id)
      if (result.success) {
        toaster.success({ title: 'Занятие подтверждено' })
      } else {
        // При ошибке статус откатится автоматически
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  const handleCancel = () => {
    if (!showCancelReason) {
      setShowCancelReason(true)
      return
    }

    startTransition(async () => {
      // Оптимистично обновляем статус
      setOptimisticStatus('CANCELLED')
      const result = await cancelLessonAction(lesson.id, cancelReason || undefined)
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

  const handleComplete = () => {
    if (!showNotes) {
      setShowNotes(true)
      return
    }

    startTransition(async () => {
      // Оптимистично обновляем статус
      setOptimisticStatus('COMPLETED')
      const result = await completeLessonAction(lesson.id, notes || undefined)
      if (result.success) {
        toaster.success({ title: 'Занятие завершено' })
        setShowNotes(false)
        setNotes('')
      } else {
        // При ошибке статус откатится автоматически
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  const handleNoShow = () => {
    startTransition(async () => {
      // Оптимистично обновляем статус
      setOptimisticStatus('NO_SHOW')
      const result = await markNoShowAction(lesson.id)
      if (result.success) {
        toaster.success({ title: 'Неявка отмечена' })
      } else {
        // При ошибке статус откатится автоматически
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  // Обработчик свайпа вправо (подтверждение или завершение)
  const handleSwipeRight = useCallback(() => {
    const isNowPast = new Date(lesson.slot.startTime) < new Date()
    if (canConfirm) {
      startTransition(async () => {
        setOptimisticStatus('CONFIRMED')
        const result = await confirmLessonAction(lesson.id)
        if (result.success) {
          toaster.success({ title: 'Занятие подтверждено' })
        } else {
          toaster.error({ title: 'Ошибка', description: result.error })
        }
      })
    } else if (canComplete && isNowPast) {
      startTransition(async () => {
        setOptimisticStatus('COMPLETED')
        const result = await completeLessonAction(lesson.id)
        if (result.success) {
          toaster.success({ title: 'Занятие завершено' })
        } else {
          toaster.error({ title: 'Ошибка', description: result.error })
        }
      })
    }
  }, [canConfirm, canComplete, lesson.id, lesson.slot.startTime, setOptimisticStatus])

  // Обработчик свайпа влево (отмена)
  const handleSwipeLeft = useCallback(() => {
    if (canCancel) {
      startTransition(async () => {
        setOptimisticStatus('CANCELLED')
        const result = await cancelLessonAction(lesson.id)
        if (result.success) {
          toaster.success({ title: 'Занятие отменено' })
        } else {
          toaster.error({ title: 'Ошибка', description: result.error })
        }
      })
    }
  }, [canCancel, lesson.id, setOptimisticStatus])

  // Определяем текст для свайпа вправо
  const rightLabel = canConfirm ? 'Подтвердить' : 'Завершить'
  const disableRight = !canConfirm && !(canComplete && isPast)

  return (
    <SwipeableCard
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      leftLabel="Отменить"
      rightLabel={rightLabel}
      disableLeft={!canCancel}
      disableRight={disableRight}
    >
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
              <StatusBadge status={optimisticStatus} config={LESSON_STATUS_CONFIG} size="lg" />
            </HStack>

            {/* Время */}
            <HStack gap={2}>
              <Icon color="fg.muted">
                <LuClock />
              </Icon>
              <Text>{timeStr}</Text>
            </HStack>

            {/* Ученик */}
            <HStack gap={2}>
              <Icon color="fg.muted">
                <LuUser />
              </Icon>
              <Text>{lesson.student.name}</Text>
              <Text color="fg.muted" fontSize="sm">
                ({lesson.student.email})
              </Text>
            </HStack>

            {/* Заметки инструктора (если есть) */}
            {lesson.instructorNotes && (
              <Box bg="bg.muted" p={3} borderRadius="md">
                <Text fontSize="sm" color="fg.muted">
                  Заметки: {lesson.instructorNotes}
                </Text>
              </Box>
            )}

            {/* Причина отмены (если отменено) */}
            {lesson.cancelReason && (
              <Box layerStyle="panel.error">
                <Text fontSize="sm" color="error.fg">
                  Причина отмены: {lesson.cancelReason}
                </Text>
              </Box>
            )}

            {/* Форма для заметок при завершении */}
            {showNotes && (
              <Box>
                <Textarea
                  placeholder="Заметки о занятии (необязательно)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
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

            {/* Кнопки действий с контекстными aria-labels для accessibility */}
            <Stack direction={{ base: 'column', sm: 'row' }} gap={2} wrap={{ sm: 'wrap' }}>
              {canConfirm && (
                <Button
                  colorPalette="green"
                  size="md"
                  onClick={handleConfirm}
                  loading={isPending}
                  aria-label={`Подтвердить занятие с ${lesson.student.name} на ${dateStr}`}
                >
                  <Icon>
                    <LuCheck />
                  </Icon>
                  Подтвердить
                </Button>
              )}

              {canComplete && isPast && (
                <>
                  <Button
                    colorPalette="brand"
                    size="md"
                    onClick={handleComplete}
                    loading={isPending}
                    aria-label={`Завершить занятие с ${lesson.student.name} на ${dateStr}`}
                  >
                    <Icon>
                      <LuCheck />
                    </Icon>
                    {showNotes ? 'Сохранить' : 'Завершить'}
                  </Button>

                  <Button
                    colorPalette="orange"
                    variant="outline"
                    size="md"
                    onClick={handleNoShow}
                    loading={isPending}
                    aria-label={`Отметить неявку ученика ${lesson.student.name} на ${dateStr}`}
                  >
                    Неявка
                  </Button>
                </>
              )}

              {canCancel && (
                <Button
                  colorPalette="red"
                  variant="outline"
                  size="md"
                  onClick={handleCancel}
                  loading={isPending}
                  aria-label={`Отменить занятие с ${lesson.student.name} на ${dateStr}`}
                >
                  <Icon>
                    <LuX />
                  </Icon>
                  {showCancelReason ? 'Подтвердить отмену' : 'Отменить'}
                </Button>
              )}

              {showCancelReason && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setShowCancelReason(false)
                    setCancelReason('')
                  }}
                  aria-label="Вернуться к просмотру занятия"
                >
                  Назад
                </Button>
              )}

              {showNotes && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setShowNotes(false)
                    setNotes('')
                  }}
                >
                  Назад
                </Button>
              )}
            </Stack>
          </VStack>
        </Card.Body>
      </Card.Root>
    </SwipeableCard>
  )
}
