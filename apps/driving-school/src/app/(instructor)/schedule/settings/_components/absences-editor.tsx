'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, Field, Flex, HStack, IconButton, Input, SegmentGroup, Stack, Text } from '@chakra-ui/react'
import type { AbsenceType } from '@letar/driving-school-db/prisma'
import { formatDateLong } from '@letar/format-utils'
import { Tooltip } from '@letar/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LuBriefcase, LuCheck, LuPill, LuPlus, LuTrash2, LuX } from 'react-icons/lu'

import { type AbsenceData, createAbsence, deleteAbsence, endAbsence } from '../_actions/absences.action'

const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  VACATION: 'Отпуск',
  SICK_LEAVE: 'Больничный',
}

const ABSENCE_TYPE_ICONS: Record<AbsenceType, typeof LuBriefcase> = {
  VACATION: LuBriefcase,
  SICK_LEAVE: LuPill,
}

interface AbsencesEditorProps {
  initialAbsences: AbsenceData[]
}

export function AbsencesEditor({ initialAbsences }: AbsencesEditorProps) {
  const router = useRouter()
  const [absences, setAbsences] = useState<AbsenceData[]>(initialAbsences)
  const [isAdding, setIsAdding] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Форма добавления
  const [formData, setFormData] = useState({
    type: 'VACATION' as AbsenceType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reason: '',
  })

  const resetForm = () => {
    setFormData({
      type: 'VACATION',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      reason: '',
    })
  }

  const handleStartAdd = () => {
    resetForm()
    setIsAdding(true)
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    resetForm()
  }

  const handleCreate = () => {
    // Валидация
    if (!formData.startDate) {
      toaster.error({ title: 'Укажите дату начала' })
      return
    }

    if (formData.type === 'VACATION' && !formData.endDate) {
      toaster.error({ title: 'Укажите дату окончания отпуска' })
      return
    }

    startTransition(async () => {
      const result = await createAbsence(
        formData.type,
        new Date(formData.startDate),
        formData.endDate ? new Date(formData.endDate) : null,
        formData.reason || undefined
      )

      if (result.success) {
        toaster.success({
          title: `${ABSENCE_TYPE_LABELS[formData.type]} создан`,
          description: result.slotsBlocked > 0 ? `Заблокировано ${result.slotsBlocked} слотов` : undefined,
        })
        setAbsences((prev) => [result.absence, ...prev])
        setIsAdding(false)
        resetForm()
        router.refresh()
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  const handleEnd = (absence: AbsenceData) => {
    if (!confirm('Завершить отсутствие и разблокировать будущие слоты?')) {
      return
    }

    startTransition(async () => {
      const result = await endAbsence(absence.id)

      if (result.success) {
        toaster.success({
          title: 'Отсутствие завершено',
          description: result.slotsUnblocked > 0 ? `Разблокировано ${result.slotsUnblocked} слотов` : undefined,
        })
        setAbsences((prev) =>
          prev.map((a) => (a.id === absence.id ? { ...a, isActive: false, returnedAt: new Date() } : a))
        )
        router.refresh()
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  const handleDelete = (absence: AbsenceData) => {
    if (!confirm('Удалить запись об отсутствии? Слоты будут разблокированы.')) {
      return
    }

    startTransition(async () => {
      const result = await deleteAbsence(absence.id)

      if (result.success) {
        toaster.success({
          title: 'Отсутствие удалено',
          description: result.slotsUnblocked > 0 ? `Разблокировано ${result.slotsUnblocked} слотов` : undefined,
        })
        setAbsences((prev) => prev.filter((a) => a.id !== absence.id))
        router.refresh()
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  // Разделяем на активные и завершённые
  const activeAbsences = absences.filter((a) => a.isActive)
  const pastAbsences = absences.filter((a) => !a.isActive)

  return (
    <Stack gap={4}>
      <Flex justify="space-between" align="center">
        <Text fontWeight="bold" fontSize="lg">
          Отсутствия
        </Text>
        {!isAdding && (
          <Button size="sm" variant="outline" onClick={handleStartAdd}>
            <LuPlus />
            Добавить
          </Button>
        )}
      </Flex>

      {/* Форма добавления */}
      {isAdding && (
        <Box bg="bg.subtle" p={4} borderRadius="md">
          <Stack gap={4}>
            {/* Тип отсутствия */}
            <Field.Root>
              <Field.Label>Тип</Field.Label>
              <SegmentGroup.Root
                value={formData.type}
                onValueChange={(e) => setFormData((prev) => ({ ...prev, type: e.value as AbsenceType }))}
              >
                <SegmentGroup.Indicator />
                <SegmentGroup.Item value="VACATION">
                  <SegmentGroup.ItemText>Отпуск</SegmentGroup.ItemText>
                  <SegmentGroup.ItemHiddenInput />
                </SegmentGroup.Item>
                <SegmentGroup.Item value="SICK_LEAVE">
                  <SegmentGroup.ItemText>Больничный</SegmentGroup.ItemText>
                  <SegmentGroup.ItemHiddenInput />
                </SegmentGroup.Item>
              </SegmentGroup.Root>
            </Field.Root>

            {/* Даты */}
            <HStack gap={4} wrap="wrap">
              <Field.Root flex={1} minW="150px">
                <Field.Label>Дата начала</Field.Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </Field.Root>

              <Field.Root flex={1} minW="150px">
                <Field.Label>
                  Дата окончания
                  {formData.type === 'SICK_LEAVE' && (
                    <Text as="span" color="fg.muted" fontSize="xs" ml={1}>
                      (опционально)
                    </Text>
                  )}
                </Field.Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  min={formData.startDate}
                />
              </Field.Root>
            </HStack>

            {/* Причина */}
            <Field.Root>
              <Field.Label>
                Причина
                <Text as="span" color="fg.muted" fontSize="xs" ml={1}>
                  (опционально)
                </Text>
              </Field.Label>
              <Input
                placeholder="Например: Семейные обстоятельства"
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              />
            </Field.Root>

            {/* Кнопки */}
            <HStack gap={2} justify="flex-end">
              <Button variant="ghost" onClick={handleCancelAdd} disabled={isPending}>
                Отмена
              </Button>
              <Button colorPalette="brand" onClick={handleCreate} loading={isPending}>
                Создать
              </Button>
            </HStack>
          </Stack>
        </Box>
      )}

      {/* Активные отсутствия */}
      {activeAbsences.length > 0 && (
        <Stack gap={2}>
          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
            Активные
          </Text>
          {activeAbsences.map((absence) => {
            const Icon = ABSENCE_TYPE_ICONS[absence.type]
            return (
              <Box
                key={absence.id}
                bg="bg.panel"
                p={3}
                borderRadius="md"
                borderWidth="1px"
                borderLeftWidth="4px"
                borderLeftColor={absence.type === 'VACATION' ? 'info.solid' : 'warning.solid'}
              >
                <Flex justify="space-between" align="center" gap={2} wrap="wrap">
                  <HStack gap={2}>
                    <Icon size={16} />
                    <Text fontWeight="medium">{ABSENCE_TYPE_LABELS[absence.type]}</Text>
                    <Badge colorPalette="green" size="sm">
                      Активно
                    </Badge>
                  </HStack>

                  <HStack gap={1}>
                    <Tooltip content="Завершить отсутствие">
                      <IconButton
                        aria-label="Завершить"
                        size="sm"
                        variant="ghost"
                        colorPalette="green"
                        onClick={() => handleEnd(absence)}
                        disabled={isPending}
                      >
                        <LuCheck />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content="Удалить">
                      <IconButton
                        aria-label="Удалить"
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => handleDelete(absence)}
                        disabled={isPending}
                      >
                        <LuTrash2 />
                      </IconButton>
                    </Tooltip>
                  </HStack>
                </Flex>

                <Text fontSize="sm" color="fg.muted" mt={1}>
                  {formatDateLong(new Date(absence.startDate))}
                  {absence.endDate && ` — ${formatDateLong(new Date(absence.endDate))}`}
                  {!absence.endDate && ' — не указано'}
                </Text>

                {absence.reason && (
                  <Text fontSize="sm" color="fg.muted" mt={1}>
                    {absence.reason}
                  </Text>
                )}
              </Box>
            )
          })}
        </Stack>
      )}

      {/* Завершённые отсутствия */}
      {pastAbsences.length > 0 && (
        <Stack gap={2}>
          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
            История
          </Text>
          {pastAbsences.slice(0, 5).map((absence) => {
            const Icon = ABSENCE_TYPE_ICONS[absence.type]
            return (
              <Box key={absence.id} bg="bg.subtle" p={3} borderRadius="md" opacity={0.7}>
                <Flex justify="space-between" align="center" gap={2} wrap="wrap">
                  <HStack gap={2}>
                    <Icon size={16} />
                    <Text fontWeight="medium">{ABSENCE_TYPE_LABELS[absence.type]}</Text>
                  </HStack>

                  <Tooltip content="Удалить">
                    <IconButton
                      aria-label="Удалить"
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => handleDelete(absence)}
                      disabled={isPending}
                    >
                      <LuX />
                    </IconButton>
                  </Tooltip>
                </Flex>

                <Text fontSize="sm" color="fg.muted" mt={1}>
                  {formatDateLong(new Date(absence.startDate))}
                  {absence.endDate && ` — ${formatDateLong(new Date(absence.endDate))}`}
                </Text>
              </Box>
            )
          })}
        </Stack>
      )}

      {/* Пустое состояние */}
      {absences.length === 0 && !isAdding && (
        <Box bg="bg.subtle" p={4} borderRadius="md" textAlign="center">
          <Text color="fg.muted">Нет записей об отсутствиях</Text>
        </Box>
      )}
    </Stack>
  )
}
