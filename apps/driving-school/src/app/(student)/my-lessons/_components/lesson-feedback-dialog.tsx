'use client'

/**
 * Диалог оценки занятия после его завершения.
 *
 * Позволяет ученику:
 * - Поставить общую оценку (1-5 звёзд)
 * - Отметить качественные аспекты (пунктуальность, терпеливость и т.д.)
 * - Оценить состояние автомобиля
 * - Написать текстовый отзыв
 *
 * @example
 * ```tsx
 * <LessonFeedbackDialog
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   lesson={completedLesson}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */

import { toaster } from '@/app/_components/ui/toaster'
import {
  Button,
  Checkbox,
  CloseButton,
  Dialog,
  HStack,
  Icon,
  Portal,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useAppForm } from '@letar/forms'
import { useState, useTransition } from 'react'
import { LuCar, LuClock, LuHeart, LuMessageSquare, LuShield, LuStar, LuThumbsUp } from 'react-icons/lu'

import { createReviewAction } from '../../my-reviews/_actions/review.action'
import { type ReviewFormData } from '../../my-reviews/_schemas/review-form.schema'

/**
 * Данные занятия для диалога
 */
export interface FeedbackLessonData {
  id: string
  instructor: {
    name: string
    image?: string | null
  }
  slot: {
    startTime: string | Date
    endTime: string | Date
  }
}

export interface LessonFeedbackDialogProps {
  /** Открыт ли диалог */
  isOpen: boolean
  /** Колбэк закрытия */
  onClose: () => void
  /** Данные занятия */
  lesson: FeedbackLessonData | null
  /** Колбэк успешной отправки */
  onSuccess?: () => void
}

/**
 * Компонент звёздного рейтинга
 */
function StarRating({
  value,
  onChange,
  label,
  size = 'md',
}: {
  value: number
  onChange: (value: number) => void
  label: string
  size?: 'sm' | 'md'
}) {
  const iconSize = size === 'sm' ? 5 : 7

  return (
    <VStack align="start" gap={1}>
      <Text fontSize="sm" fontWeight="medium">
        {label}
      </Text>
      <HStack gap={1}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            boxSize={iconSize}
            cursor="pointer"
            color={star <= value ? 'yellow.400' : 'gray.300'}
            onClick={() => onChange(star)}
            transition="transform 0.1s"
            _hover={{ transform: 'scale(1.1)' }}
          >
            <LuStar fill={star <= value ? 'currentColor' : 'none'} />
          </Icon>
        ))}
      </HStack>
    </VStack>
  )
}

/**
 * Качественный аспект занятия с иконкой
 */
function QualityAspect({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Checkbox.Root checked={checked} onCheckedChange={(e) => onChange(!!e.checked)} cursor="pointer">
      <Checkbox.HiddenInput />
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
      <Checkbox.Label>
        <HStack gap={2}>
          {icon}
          <Text fontSize="sm">{label}</Text>
        </HStack>
      </Checkbox.Label>
    </Checkbox.Root>
  )
}

/**
 * Диалог оценки завершённого занятия
 */
export function LessonFeedbackDialog({ isOpen, onClose, lesson, onSuccess }: LessonFeedbackDialogProps) {
  const [isPending, startTransition] = useTransition()

  const form = useAppForm({
    defaultValues: {
      lessonId: lesson?.id ?? '',
      rating: 0,
      text: '',
      wasOnTime: false as boolean,
      wasPatient: false as boolean,
      explainedWell: false as boolean,
      feltSafe: false as boolean,
      vehicleRating: undefined as number | undefined,
      wouldRecommend: false as boolean,
    } satisfies ReviewFormData,
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await createReviewAction(value as ReviewFormData)

        if (result.success) {
          toaster.success({ title: 'Спасибо за отзыв!', description: 'Ваша оценка поможет улучшить качество обучения' })
          form.reset()
          onClose()
          onSuccess?.()
        } else {
          toaster.error({ title: 'Ошибка', description: result.error })
        }
      })
    },
  })

  // Синхронизация lessonId при изменении lesson
  if (lesson && form.getFieldValue('lessonId') !== lesson.id) {
    form.setFieldValue('lessonId', lesson.id)
  }

  if (!lesson) {
    return null
  }

  const startTime = new Date(lesson.slot.startTime)

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && !isPending && onClose()}
      size={{ base: 'full', md: 'lg' }}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <VStack align="start" gap={1}>
                <Dialog.Title>Оцените занятие</Dialog.Title>
                <Text fontSize="sm" color="fg.muted">
                  {startTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} с {lesson.instructor.name}
                </Text>
              </VStack>
            </Dialog.Header>

            <Dialog.CloseTrigger asChild disabled={isPending}>
              <CloseButton size="sm" aria-label="Закрыть" />
            </Dialog.CloseTrigger>

            <Dialog.Body>
              <form.AppForm>
                <VStack align="stretch" gap={6}>
                  {/* Общая оценка */}
                  <form.Field name="rating">
                    {(field) => (
                      <StarRating
                        value={field.state.value ?? 0}
                        onChange={(v) => field.handleChange(v)}
                        label="Общая оценка занятия"
                      />
                    )}
                  </form.Field>

                  {/* Качественные аспекты */}
                  <VStack align="stretch" gap={3}>
                    <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                      Отметьте, что вам понравилось:
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                      <form.Field name="wasOnTime">
                        {(field) => (
                          <QualityAspect
                            icon={
                              <Icon color="green.500">
                                <LuClock />
                              </Icon>
                            }
                            label="Приехал вовремя"
                            checked={!!field.state.value}
                            onChange={(v: boolean) => field.handleChange(v)}
                          />
                        )}
                      </form.Field>

                      <form.Field name="wasPatient">
                        {(field) => (
                          <QualityAspect
                            icon={
                              <Icon color="blue.500">
                                <LuHeart />
                              </Icon>
                            }
                            label="Был терпелив"
                            checked={!!field.state.value}
                            onChange={(v: boolean) => field.handleChange(v)}
                          />
                        )}
                      </form.Field>

                      <form.Field name="explainedWell">
                        {(field) => (
                          <QualityAspect
                            icon={
                              <Icon color="purple.500">
                                <LuMessageSquare />
                              </Icon>
                            }
                            label="Понятно объяснял"
                            checked={!!field.state.value}
                            onChange={(v: boolean) => field.handleChange(v)}
                          />
                        )}
                      </form.Field>

                      <form.Field name="feltSafe">
                        {(field) => (
                          <QualityAspect
                            icon={
                              <Icon color="orange.500">
                                <LuShield />
                              </Icon>
                            }
                            label="Чувствовал себя в безопасности"
                            checked={!!field.state.value}
                            onChange={(v: boolean) => field.handleChange(v)}
                          />
                        )}
                      </form.Field>
                    </SimpleGrid>
                  </VStack>

                  {/* Оценка автомобиля */}
                  <form.Field name="vehicleRating">
                    {(field) => (
                      <VStack align="start" gap={2}>
                        <HStack gap={2}>
                          <Icon color="gray.500">
                            <LuCar />
                          </Icon>
                          <Text fontSize="sm" fontWeight="medium">
                            Состояние автомобиля
                          </Text>
                        </HStack>
                        <StarRating
                          value={field.state.value ?? 0}
                          onChange={(v) => field.handleChange(v)}
                          label=""
                          size="sm"
                        />
                      </VStack>
                    )}
                  </form.Field>

                  {/* Рекомендация */}
                  <form.Field name="wouldRecommend">
                    {(field) => (
                      <QualityAspect
                        icon={
                          <Icon color="green.500">
                            <LuThumbsUp />
                          </Icon>
                        }
                        label="Рекомендовал бы этого инструктора друзьям"
                        checked={!!field.state.value}
                        onChange={(v: boolean) => field.handleChange(v)}
                      />
                    )}
                  </form.Field>

                  {/* Текстовый отзыв */}
                  <form.Field name="text">
                    {(field) => (
                      <VStack align="stretch" gap={2}>
                        <Text fontSize="sm" fontWeight="medium">
                          Комментарий (необязательно)
                        </Text>
                        <Textarea
                          value={field.state.value ?? ''}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Расскажите подробнее о вашем опыте..."
                          rows={3}
                        />
                      </VStack>
                    )}
                  </form.Field>
                </VStack>
              </form.AppForm>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={3} justify="flex-end" width="100%">
                <Button variant="ghost" onClick={onClose} disabled={isPending}>
                  Пропустить
                </Button>
                <Button
                  colorPalette="blue"
                  onClick={() => form.handleSubmit()}
                  loading={isPending}
                  disabled={form.getFieldValue('rating') === 0}
                >
                  Отправить отзыв
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

/**
 * Хук для управления диалогом оценки занятия
 */
export function useLessonFeedbackDialog() {
  const [state, setState] = useState<{ isOpen: boolean; lesson: FeedbackLessonData | null }>({
    isOpen: false,
    lesson: null,
  })

  const open = (lesson: FeedbackLessonData) => {
    setState({ isOpen: true, lesson })
  }

  const close = () => {
    setState({ isOpen: false, lesson: null })
  }

  return {
    isOpen: state.isOpen,
    lesson: state.lesson,
    open,
    close,
  }
}
