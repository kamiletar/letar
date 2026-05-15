'use client'

import { toaster } from '@/app/_components/ui/toaster'
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  EmptyState,
  HStack,
  IconButton,
  Portal,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { Form } from '@letar/forms'
import { useCallback, useEffect, useState } from 'react'
import { LuArchive, LuClock, LuGraduationCap, LuPencil, LuPlus, LuRefreshCw, LuUsers, LuWallet } from 'react-icons/lu'
import { z } from 'zod/v4'

import { LicenseCategoryFormSchema as LicenseCategorySchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import {
  createOptionalLessonTypeAction,
  deactivateOptionalLessonTypeAction,
  getOptionalLessonTypesAction,
  type OptionalLessonTypeSummary,
  updateOptionalLessonTypeAction,
} from '../../_actions/optional-lessons.action'

// Схема формы
const OptionalLessonFormSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Минимум 2 символа')
      .meta({ ui: { title: 'Название', placeholder: 'Вождение ночью' } }),

    description: z
      .string()
      .nullable()
      .optional()
      .meta({ ui: { title: 'Описание' } }),

    category: LicenseCategorySchema.nullable()
      .optional()
      .meta({ ui: { title: 'Категория ВУ' } }),

    durationMinutes: z
      .number()
      .min(30, 'Минимум 30 минут')
      .meta({ ui: { title: 'Длительность (мин)', placeholder: '90' } }),

    price: z
      .number()
      .min(0, 'Цена не может быть отрицательной')
      .meta({ ui: { title: 'Стоимость (руб)' } }),

    sortOrder: z
      .number()
      .default(0)
      .meta({ ui: { title: 'Порядок сортировки' } }),
  })
  .strip()

type OptionalLessonFormData = z.infer<typeof OptionalLessonFormSchema>

// Опции категорий
const CATEGORY_OPTIONS: { label: string; value: LicenseCategory }[] = [
  { label: 'M', value: 'M' },
  { label: 'A1', value: 'A1' },
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
]

interface OptionalLessonsSectionProps {
  schoolId: string
}

export function OptionalLessonsSection({ schoolId }: OptionalLessonsSectionProps) {
  const [lessonTypes, setLessonTypes] = useState<OptionalLessonTypeSummary[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<OptionalLessonTypeSummary | null>(null)

  const loadLessonTypes = useCallback(async () => {
    const result = await getOptionalLessonTypesAction(schoolId)
    if (result.success) {
      setLessonTypes(result.lessonTypes)
    }
  }, [schoolId])

  useEffect(() => {
    loadLessonTypes()
  }, [loadLessonTypes])

  const handleCreate = () => {
    setEditingLesson(null)
    setIsFormOpen(true)
  }

  const handleEdit = (lesson: OptionalLessonTypeSummary) => {
    setEditingLesson(lesson)
    setIsFormOpen(true)
  }

  const handleDeactivate = async (lesson: OptionalLessonTypeSummary) => {
    const result = await deactivateOptionalLessonTypeAction(lesson.id)
    if (result.success) {
      toaster.success({ title: 'Занятие деактивировано' })
      loadLessonTypes()
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.message || 'Не удалось деактивировать',
      })
    }
  }

  const handleActivate = async (lesson: OptionalLessonTypeSummary) => {
    const result = await updateOptionalLessonTypeAction(lesson.id, { isActive: true })
    if (result.success) {
      toaster.success({ title: 'Занятие активировано' })
      loadLessonTypes()
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.message || 'Не удалось активировать',
      })
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setEditingLesson(null)
    loadLessonTypes()
  }

  const activeLessons = lessonTypes.filter((l) => l.isActive)
  const inactiveLessons = lessonTypes.filter((l) => !l.isActive)

  const formatPrice = (price: number) => new Intl.NumberFormat('ru-RU').format(price)

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Text fontSize="lg" fontWeight="semibold">
          Опциональные занятия
        </Text>
        <Button size="sm" onClick={handleCreate}>
          <LuPlus />
          Добавить
        </Button>
      </HStack>

      {lessonTypes.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <LuGraduationCap />
            </EmptyState.Indicator>
            <EmptyState.Title>Нет опциональных занятий</EmptyState.Title>
            <EmptyState.Description>
              Добавьте дополнительные занятия, которые ученики могут приобрести отдельно
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <VStack gap={4} align="stretch">
          {activeLessons.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={3}>
              {activeLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  onEdit={handleEdit}
                  onDeactivate={handleDeactivate}
                  formatPrice={formatPrice}
                />
              ))}
            </SimpleGrid>
          )}

          {inactiveLessons.length > 0 && (
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={2}>
                Неактивные ({inactiveLessons.length})
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={3}>
                {inactiveLessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onEdit={handleEdit}
                    onActivate={handleActivate}
                    isInactive
                    formatPrice={formatPrice}
                  />
                ))}
              </SimpleGrid>
            </Box>
          )}
        </VStack>
      )}

      {/* Форма создания/редактирования */}
      <OptionalLessonFormDialog
        schoolId={schoolId}
        lesson={editingLesson}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleFormSuccess}
      />
    </Box>
  )
}

// Карточка опционального занятия
interface LessonCardProps {
  lesson: OptionalLessonTypeSummary
  onEdit: (lesson: OptionalLessonTypeSummary) => void
  onDeactivate?: (lesson: OptionalLessonTypeSummary) => void
  onActivate?: (lesson: OptionalLessonTypeSummary) => void
  isInactive?: boolean
  formatPrice: (price: number) => string
}

function LessonCard({ lesson, onEdit, onDeactivate, onActivate, isInactive, formatPrice }: LessonCardProps) {
  return (
    <Card.Root size="sm" opacity={isInactive ? 0.7 : 1}>
      <Card.Body>
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <Text fontWeight="medium">{lesson.name}</Text>
            {lesson.category && (
              <Badge colorPalette="purple" size="sm">
                {lesson.category}
              </Badge>
            )}
          </HStack>

          <VStack align="stretch" gap={1} fontSize="sm" color="fg.muted">
            <HStack gap={2}>
              <LuClock size={14} />
              <Text>{lesson.durationMinutes} мин</Text>
            </HStack>
            <HStack gap={2}>
              <LuWallet size={14} />
              <Text>{formatPrice(lesson.price)} руб</Text>
            </HStack>
            <HStack gap={2}>
              <LuUsers size={14} />
              <Text>{lesson.purchasesCount} покупок</Text>
            </HStack>
          </VStack>

          <HStack justify="flex-end" pt={1}>
            {isInactive ? (
              <IconButton aria-label="Активировать" variant="ghost" size="xs" onClick={() => onActivate?.(lesson)}>
                <LuRefreshCw />
              </IconButton>
            ) : (
              <>
                <IconButton aria-label="Редактировать" variant="ghost" size="xs" onClick={() => onEdit(lesson)}>
                  <LuPencil />
                </IconButton>
                <IconButton
                  aria-label="Деактивировать"
                  variant="ghost"
                  size="xs"
                  colorPalette="red"
                  onClick={() => onDeactivate?.(lesson)}
                >
                  <LuArchive />
                </IconButton>
              </>
            )}
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

// Диалог формы
interface OptionalLessonFormDialogProps {
  schoolId: string
  lesson: OptionalLessonTypeSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function OptionalLessonFormDialog({ schoolId, lesson, open, onOpenChange, onSuccess }: OptionalLessonFormDialogProps) {
  const isEdit = !!lesson

  const initialValue: OptionalLessonFormData = lesson
    ? {
        name: lesson.name,
        description: lesson.description,
        category: lesson.category,
        durationMinutes: lesson.durationMinutes,
        price: lesson.price,
        sortOrder: lesson.sortOrder,
      }
    : {
        name: '',
        description: null,
        category: null,
        durationMinutes: 90,
        price: 0,
        sortOrder: 0,
      }

  const handleSubmit = async (data: OptionalLessonFormData) => {
    if (isEdit) {
      const result = await updateOptionalLessonTypeAction(lesson.id, data)
      if (result.success) {
        toaster.success({ title: 'Занятие обновлено' })
        onSuccess()
      } else {
        toaster.error({ title: 'Ошибка', description: result.message })
      }
    } else {
      const result = await createOptionalLessonTypeAction({
        organizationId: schoolId,
        ...data,
      })
      if (result.success) {
        toaster.success({ title: 'Занятие создано' })
        onSuccess()
      } else {
        toaster.error({ title: 'Ошибка', description: result.message })
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size={{ base: 'full', md: 'md' }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{isEdit ? 'Редактирование занятия' : 'Новое опциональное занятие'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Form initialValue={initialValue} schema={OptionalLessonFormSchema} onSubmit={handleSubmit}>
                <VStack gap={4} align="stretch">
                  <Form.Field.String name="name" />
                  <Form.Field.Textarea name="description" />

                  <HStack gap={4} align="start">
                    <Form.Field.Select name="category" options={CATEGORY_OPTIONS} placeholder="Все" clearable />
                    <Form.Field.Number name="durationMinutes" />
                  </HStack>

                  <HStack gap={4} align="start">
                    <Form.Field.Number name="price" />
                    <Form.Field.Number name="sortOrder" />
                  </HStack>

                  <HStack justify="flex-end" pt={4}>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Отмена
                    </Button>
                    <Form.Button.Submit>{isEdit ? 'Сохранить' : 'Создать'}</Form.Button.Submit>
                  </HStack>
                </VStack>
              </Form>
            </Dialog.Body>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
