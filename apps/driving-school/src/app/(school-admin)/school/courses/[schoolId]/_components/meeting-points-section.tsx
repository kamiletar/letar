'use client'

import { toaster } from '@/app/_components/ui/toaster'
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  HStack,
  IconButton,
  Portal,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Form, useDeclarativeForm } from '@letar/forms'
import type { AnyFieldApi } from '@tanstack/react-form'
import { type ReactElement, useCallback, useEffect, useState } from 'react'
import type { DaDataAddress, DaDataSuggestion } from 'react-dadata'
import { LuArchive, LuBuilding, LuMapPin, LuPencil, LuPlus, LuRefreshCw, LuStar, LuUsers } from 'react-icons/lu'
import { z } from 'zod/v4'

import { AddressInput } from '@/app/_components/address-input'

import {
  createMeetingPointAction,
  deactivateMeetingPointAction,
  getMeetingPointsAction,
  type MeetingPointSummary,
  setDefaultMeetingPointAction,
  updateMeetingPointAction,
} from '../../_actions/meeting-points.action'

// Схема формы
const MeetingPointFormSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Минимум 2 символа')
      .meta({ ui: { title: 'Название', placeholder: 'Метро Пушкинская' } }),

    address: z
      .string()
      .min(5, 'Минимум 5 символов')
      .meta({ ui: { title: 'Адрес', placeholder: 'Тверская ул., д. 1' } }),

    description: z
      .string()
      .nullable()
      .optional()
      .meta({ ui: { title: 'Описание/ориентиры' } }),

    geoLat: z
      .string()
      .nullable()
      .optional()
      .meta({ ui: { title: 'Широта' } }),

    geoLon: z
      .string()
      .nullable()
      .optional()
      .meta({ ui: { title: 'Долгота' } }),

    isDefault: z
      .boolean()
      .default(false)
      .meta({ ui: { title: 'Точка по умолчанию' } }),
  })
  .strip()

type MeetingPointFormData = z.infer<typeof MeetingPointFormSchema>

interface MeetingPointsSectionProps {
  schoolId: string
}

export function MeetingPointsSection({ schoolId }: MeetingPointsSectionProps) {
  const [meetingPoints, setMeetingPoints] = useState<MeetingPointSummary[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPoint, setEditingPoint] = useState<MeetingPointSummary | null>(null)

  const loadMeetingPoints = useCallback(async () => {
    const result = await getMeetingPointsAction(schoolId)
    if (result.success) {
      setMeetingPoints(result.meetingPoints)
    }
  }, [schoolId])

  useEffect(() => {
    loadMeetingPoints()
  }, [loadMeetingPoints])

  const handleCreate = () => {
    setEditingPoint(null)
    setIsFormOpen(true)
  }

  const handleEdit = (point: MeetingPointSummary) => {
    setEditingPoint(point)
    setIsFormOpen(true)
  }

  const handleDeactivate = async (point: MeetingPointSummary) => {
    const result = await deactivateMeetingPointAction(point.id)
    if (result.success) {
      toaster.success({ title: 'Точка деактивирована' })
      loadMeetingPoints()
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.message || 'Не удалось деактивировать',
      })
    }
  }

  const handleActivate = async (point: MeetingPointSummary) => {
    const result = await updateMeetingPointAction(point.id, { isActive: true })
    if (result.success) {
      toaster.success({ title: 'Точка активирована' })
      loadMeetingPoints()
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.message || 'Не удалось активировать',
      })
    }
  }

  const handleSetDefault = async (point: MeetingPointSummary) => {
    const result = await setDefaultMeetingPointAction(point.id)
    if (result.success) {
      toaster.success({ title: 'Точка установлена по умолчанию' })
      loadMeetingPoints()
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.message || 'Не удалось установить',
      })
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setEditingPoint(null)
    loadMeetingPoints()
  }

  const activePoints = meetingPoints.filter((p) => p.isActive)
  const inactivePoints = meetingPoints.filter((p) => !p.isActive)

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Text fontSize="lg" fontWeight="semibold">
          Точки встречи для практики
        </Text>
        <Button size="sm" onClick={handleCreate}>
          <LuPlus />
          Добавить
        </Button>
      </HStack>

      {meetingPoints.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <LuMapPin />
            </EmptyState.Indicator>
            <EmptyState.Title>Нет точек встречи</EmptyState.Title>
            <EmptyState.Description>
              Добавьте точки, где инструкторы могут встречаться с учениками
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <VStack gap={4} align="stretch">
          {activePoints.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={3}>
              {activePoints.map((point) => (
                <MeetingPointCard
                  key={point.id}
                  point={point}
                  onEdit={handleEdit}
                  onDeactivate={handleDeactivate}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </SimpleGrid>
          )}

          {inactivePoints.length > 0 && (
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={2}>
                Неактивные ({inactivePoints.length})
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={3}>
                {inactivePoints.map((point) => (
                  <MeetingPointCard
                    key={point.id}
                    point={point}
                    onEdit={handleEdit}
                    onActivate={handleActivate}
                    isInactive
                  />
                ))}
              </SimpleGrid>
            </Box>
          )}
        </VStack>
      )}

      {/* Форма создания/редактирования */}
      <MeetingPointFormDialog
        schoolId={schoolId}
        point={editingPoint}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleFormSuccess}
      />
    </Box>
  )
}

// Карточка точки встречи
interface MeetingPointCardProps {
  point: MeetingPointSummary
  onEdit: (point: MeetingPointSummary) => void
  onDeactivate?: (point: MeetingPointSummary) => void
  onActivate?: (point: MeetingPointSummary) => void
  onSetDefault?: (point: MeetingPointSummary) => void
  isInactive?: boolean
}

function MeetingPointCard({
  point,
  onEdit,
  onDeactivate,
  onActivate,
  onSetDefault,
  isInactive,
}: MeetingPointCardProps) {
  return (
    <Card.Root size="sm" opacity={isInactive ? 0.7 : 1}>
      <Card.Body>
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <HStack gap={2}>
              <Text fontWeight="medium">{point.name}</Text>
              {point.isDefault && (
                <Badge colorPalette="yellow" size="sm">
                  <LuStar size={12} />
                  По умолчанию
                </Badge>
              )}
            </HStack>
          </HStack>

          <VStack align="stretch" gap={1} fontSize="sm" color="fg.muted">
            <HStack gap={2}>
              <LuMapPin size={14} />
              <Text lineClamp={1}>{point.address}</Text>
            </HStack>
            {point.team && (
              <HStack gap={2}>
                <LuBuilding size={14} />
                <Text>{point.team.name}</Text>
              </HStack>
            )}
            <HStack gap={2}>
              <LuUsers size={14} />
              <Text>{point.instructorsCount} инструкторов</Text>
            </HStack>
          </VStack>

          {point.description && (
            <Text fontSize="xs" color="fg.muted" lineClamp={2}>
              {point.description}
            </Text>
          )}

          <HStack justify="flex-end" pt={1}>
            {isInactive ? (
              <IconButton aria-label="Активировать" variant="ghost" size="xs" onClick={() => onActivate?.(point)}>
                <LuRefreshCw />
              </IconButton>
            ) : (
              <>
                {!point.isDefault && (
                  <IconButton
                    aria-label="Сделать по умолчанию"
                    variant="ghost"
                    size="xs"
                    onClick={() => onSetDefault?.(point)}
                    title="Сделать по умолчанию"
                  >
                    <LuStar />
                  </IconButton>
                )}
                <IconButton aria-label="Редактировать" variant="ghost" size="xs" onClick={() => onEdit(point)}>
                  <LuPencil />
                </IconButton>
                <IconButton
                  aria-label="Деактивировать"
                  variant="ghost"
                  size="xs"
                  colorPalette="red"
                  onClick={() => onDeactivate?.(point)}
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

/**
 * Кастомный AddressField для точек встречи
 * При выборе адреса автоматически заполняет geoLat и geoLon
 */
function MeetingPointAddressField({ name }: { name: string }): ReactElement {
  const { form } = useDeclarativeForm()

  const handleAddressSelect = (suggestion: DaDataSuggestion<DaDataAddress>) => {
    if (suggestion.data.geo_lat) {
      form.setFieldValue('geoLat', suggestion.data.geo_lat)
    }
    if (suggestion.data.geo_lon) {
      form.setFieldValue('geoLon', suggestion.data.geo_lon)
    }
  }

  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => {
        const errors = field.state.meta.errors
        const hasError = errors && errors.length > 0
        const geoLat = form.getFieldValue('geoLat') as string
        const geoLon = form.getFieldValue('geoLon') as string

        return (
          <Field.Root invalid={hasError} required>
            <Field.Label>
              Адрес
              <Field.RequiredIndicator />
            </Field.Label>
            <AddressInput
              value={(field.state.value as string) ?? ''}
              onChange={(value) => field.handleChange(value)}
              onBlur={field.handleBlur}
              placeholder="Введите адрес точки встречи"
              onAddressSelect={handleAddressSelect}
            />
            {hasError ? (
              <Field.ErrorText>
                {errors.map((e: string | { message: string }) => (typeof e === 'string' ? e : e.message)).join(', ')}
              </Field.ErrorText>
            ) : (
              <Field.HelperText>
                {geoLat && geoLon ? `Координаты: ${geoLat}, ${geoLon}` : 'Начните вводить адрес для поиска'}
              </Field.HelperText>
            )}
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

// Диалог формы
interface MeetingPointFormDialogProps {
  schoolId: string
  point: MeetingPointSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function MeetingPointFormDialog({ schoolId, point, open, onOpenChange, onSuccess }: MeetingPointFormDialogProps) {
  const isEdit = !!point

  const initialValue: MeetingPointFormData = point
    ? {
        name: point.name,
        address: point.address,
        description: point.description,
        geoLat: point.geoLat,
        geoLon: point.geoLon,
        isDefault: point.isDefault,
      }
    : {
        name: '',
        address: '',
        description: null,
        geoLat: null,
        geoLon: null,
        isDefault: false,
      }

  const handleSubmit = async (data: MeetingPointFormData) => {
    if (isEdit) {
      const result = await updateMeetingPointAction(point.id, data)
      if (result.success) {
        toaster.success({ title: 'Точка обновлена' })
        onSuccess()
      } else {
        toaster.error({ title: 'Ошибка', description: result.message })
      }
    } else {
      const result = await createMeetingPointAction({
        organizationId: schoolId,
        ...data,
      })
      if (result.success) {
        toaster.success({ title: 'Точка создана' })
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
              <Dialog.Title>{isEdit ? 'Редактирование точки' : 'Новая точка встречи'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Form initialValue={initialValue} schema={MeetingPointFormSchema} onSubmit={handleSubmit}>
                <VStack gap={4} align="stretch">
                  <Form.Field.String name="name" />
                  <MeetingPointAddressField name="address" />
                  <Form.Field.Textarea name="description" />

                  <HStack gap={4} align="start">
                    <Form.Field.String name="geoLat" />
                    <Form.Field.String name="geoLon" />
                  </HStack>

                  <Form.Field.Switch name="isDefault" />

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
