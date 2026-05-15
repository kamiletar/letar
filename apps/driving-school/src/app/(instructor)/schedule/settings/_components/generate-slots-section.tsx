'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { formatDateLong } from '@letar/format-utils'
import { useRouter } from 'next/navigation'
import { forwardRef, useState, useTransition } from 'react'
import { LuCalendarPlus, LuLoader, LuTrash2 } from 'react-icons/lu'
import { deleteSlotsAction, generateSlotsAction } from '../_actions/schedule-settings.action'

export interface GenerateSlotsSectionProps {
  hasSettings: boolean
  planningHorizon: number
  stats: {
    totalSlots: number
    availableSlots: number
    bookedSlots: number
    lastSlotDate: Date | null
  } | null
  /** Есть ли несохранённые изменения в форме настроек */
  isDirty?: boolean
}

export const GenerateSlotsSection = forwardRef<HTMLDivElement, GenerateSlotsSectionProps>(function GenerateSlotsSection(
  { hasSettings, planningHorizon, stats, isDirty = false },
  ref
) {
  const [isPending, startTransition] = useTransition()
  const [action, setAction] = useState<'generate' | 'delete' | null>(null)
  const router = useRouter()

  const handleGenerate = () => {
    setAction('generate')
    startTransition(async () => {
      const result = await generateSlotsAction()

      if (result.success) {
        toaster.success({
          title: 'Слоты сгенерированы',
          description: `Создано ${result.slotsCreated} слотов на ${planningHorizon} дней`,
        })
        router.refresh()
      } else {
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
      setAction(null)
    })
  }

  const handleDelete = () => {
    // Подтверждение удаления
    if (!confirm('Удалить все свободные слоты? Забронированные слоты сохранятся.')) {
      return
    }

    setAction('delete')
    startTransition(async () => {
      const result = await deleteSlotsAction()

      if (result.success) {
        if (result.bookedCount > 0) {
          toaster.success({
            title: 'Слоты удалены',
            description: `Удалено ${result.deletedCount} слотов. ${result.bookedCount} забронированных сохранено.`,
          })
        } else {
          toaster.success({
            title: 'Слоты удалены',
            description: `Удалено ${result.deletedCount} слотов`,
          })
        }
        router.refresh()
      } else {
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
      setAction(null)
    })
  }

  // Если нет настроек - показываем предупреждение
  if (!hasSettings) {
    return (
      <Box
        ref={ref}
        id="generate-slots"
        bg="bg.warning"
        p={4}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.warning"
      >
        <Text color="fg.warning" fontWeight="medium">
          Сначала сохраните настройки расписания, чтобы генерировать слоты
        </Text>
      </Box>
    )
  }

  const isGenerating = isPending && action === 'generate'
  const isDeleting = isPending && action === 'delete'

  return (
    <Box ref={ref} id="generate-slots" bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
      <VStack align="stretch" gap={4}>
        <HStack justify="space-between" wrap="wrap" gap={4}>
          <Box>
            <Text fontWeight="semibold" fontSize="lg">
              Генерация расписания
            </Text>
            <Text color="fg.muted" fontSize="sm">
              Создать слоты для записи учеников на {planningHorizon} дней вперёд
            </Text>
          </Box>

          <HStack gap={2}>
            {stats && stats.totalSlots > 0 && (
              <Button
                variant="outline"
                colorPalette="red"
                onClick={handleDelete}
                disabled={isPending || isDirty}
                size="lg"
              >
                {isDeleting ? <LuLoader className="animate-spin" /> : <LuTrash2 />}
                {isDeleting ? 'Удаление...' : 'Удалить слоты'}
              </Button>
            )}
            <Button colorPalette="brand" onClick={handleGenerate} disabled={isPending || isDirty} size="lg">
              {isGenerating ? <LuLoader className="animate-spin" /> : <LuCalendarPlus />}
              {isGenerating ? 'Генерация...' : 'Сгенерировать слоты'}
            </Button>
          </HStack>
        </HStack>

        {/* Предупреждение о несохранённых изменениях */}
        {isDirty && (
          <Box layerStyle="panel.warning" p={3} borderRadius="md">
            <Text color="warning.fg" fontSize="sm" fontWeight="medium">
              Сначала сохраните изменения настроек, чтобы сгенерировать слоты с новыми параметрами
            </Text>
          </Box>
        )}

        {/* Статистика текущих слотов */}
        {stats && stats.totalSlots > 0 && (
          <Box bg="bg.subtle" p={4} borderRadius="md">
            <HStack gap={6} wrap="wrap">
              <Box>
                <Text fontSize="2xl" fontWeight="bold" color="fg">
                  {stats.totalSlots}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  всего слотов
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xl" fontWeight="bold" color="success.fg">
                  {stats.availableSlots}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  свободных
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xl" fontWeight="bold" color="info.fg">
                  {stats.bookedSlots}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  забронировано
                </Text>
              </Box>
              {stats.lastSlotDate && (
                <Box>
                  <Text fontSize="md" fontWeight="medium" color="fg">
                    до {formatDateLong(stats.lastSlotDate)}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    последний слот
                  </Text>
                </Box>
              )}
            </HStack>
          </Box>
        )}

        {stats && stats.totalSlots === 0 && (
          <Box bg="bg.subtle" p={4} borderRadius="md">
            <Text color="fg.muted">Слоты ещё не созданы. Нажмите кнопку выше, чтобы сгенерировать расписание.</Text>
          </Box>
        )}
      </VStack>
    </Box>
  )
})
