'use client'

import { Box, Button, Fieldset, Grid, HStack, Stack, Text } from '@chakra-ui/react'
import { useDeclarativeForm } from '@letar/forms'
import { FormOfflineIndicator, FormSyncStatus, useOfflineForm } from '@letar/forms/offline'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuCloudOff, LuRotateCcw, LuSave } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { DAY_NAMES, DAYS_OF_WEEK, type WorkingHoursSchedule } from '@/lib/working-hours/types'

import { BREAK_DURATION_OPTIONS, LESSON_DURATION_OPTIONS, PLANNING_HORIZON_OPTIONS } from '@/app/_constants'

import { updateScheduleSettingsAction } from '../_actions/schedule-settings.action'
import {
  calculateSlotsPerDay,
  DEFAULT_SCHEDULE_SETTINGS,
  getWorkDaysCount,
  type ScheduleSettingsFormData,
} from '../_schemas/schedule-settings.schema'

// Тип данных формы со строковыми значениями для совместимости с Select
interface ScheduleSettingsFormValues {
  workingHours: WorkingHoursSchedule
  lessonDuration: string
  breakDuration: string
  planningHorizon: string
}

interface ScheduleSettingsFormProps {
  defaultValue?: ScheduleSettingsFormData | null
  onDirtyChange?: (isDirty: boolean) => void
}

export function ScheduleSettingsForm({ defaultValue, onDirtyChange }: ScheduleSettingsFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formKey, setFormKey] = useState(0)

  // Хук для оффлайн поддержки
  const { submit: offlineSubmit, isOffline } = useOfflineForm<ScheduleSettingsFormValues>({
    actionType: 'UPDATE_SCHEDULE_SETTINGS',
    onlineSubmit: async (value: ScheduleSettingsFormValues) => {
      // Преобразуем строки в числа и JSON для Server Action
      const result = await updateScheduleSettingsAction({
        workingHours: JSON.stringify(value.workingHours),
        lessonDuration: Number(value.lessonDuration),
        breakDuration: Number(value.breakDuration),
        planningHorizon: Number(value.planningHorizon),
      })

      if (result.success) {
        return { success: true }
      }

      return {
        success: false,
        error: typeof result.error === 'string' ? result.error : 'Ошибка сохранения',
      }
    },
    onSuccess: () => {
      toaster.success({
        title: 'Настройки сохранены',
        description: 'Теперь сгенерируйте слоты для записи учеников',
      })
      router.refresh()

      // Прокрутка к секции генерации слотов
      setTimeout(() => {
        const generateSection = document.getElementById('generate-slots')
        if (generateSection) {
          generateSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    },
    onQueued: () => {
      toaster.info({
        title: 'Сохранено локально',
        description: 'Настройки будут отправлены при подключении к сети',
      })
    },
    onError: (error: string) => {
      toaster.error({
        title: 'Ошибка сохранения',
        description: error,
      })
    },
  })

  // Начальные значения из props или значения по умолчанию
  const initialSettings = defaultValue ?? DEFAULT_SCHEDULE_SETTINGS

  // Преобразуем числовые значения в строки для формы
  const initialFormValues: ScheduleSettingsFormValues = useMemo(
    () => ({
      workingHours: initialSettings.workingHours,
      lessonDuration: String(initialSettings.lessonDuration),
      breakDuration: String(initialSettings.breakDuration),
      planningHorizon: String(initialSettings.planningHorizon),
    }),
    [initialSettings]
  )

  // Отслеживаем текущие значения для определения изменений и расчёта слотов
  const [currentValues, setCurrentValues] = useState<ScheduleSettingsFormValues>(initialFormValues)

  // Вспомогательная функция расчёта информации о слотах
  const slotsInfo = useMemo(() => {
    const { workingHours } = currentValues
    const lessonDuration = Number(currentValues.lessonDuration)
    const breakDuration = Number(currentValues.breakDuration)
    const planningHorizon = Number(currentValues.planningHorizon)

    let totalSlotsPerWeek = 0
    let minSlotsPerDay = Infinity
    let maxSlotsPerDay = 0

    for (const day of DAYS_OF_WEEK) {
      const schedule = workingHours[day]
      if (schedule) {
        const slotsPerDay = calculateSlotsPerDay(schedule.open, schedule.close, lessonDuration, breakDuration)
        totalSlotsPerWeek += slotsPerDay
        minSlotsPerDay = Math.min(minSlotsPerDay, slotsPerDay)
        maxSlotsPerDay = Math.max(maxSlotsPerDay, slotsPerDay)
      }
    }

    const workDaysCount = getWorkDaysCount(workingHours)
    if (workDaysCount === 0) {
      return 'Выберите хотя бы один рабочий день'
    }

    const avgSlotsPerDay = Math.round(totalSlotsPerWeek / workDaysCount)
    const totalSlots = Math.round((totalSlotsPerWeek / 7) * planningHorizon)

    if (minSlotsPerDay === maxSlotsPerDay) {
      return `~${avgSlotsPerDay} занятий в день × ${workDaysCount} рабочих дней = до ${totalSlots} слотов за ${planningHorizon} дней`
    }

    return `${minSlotsPerDay}-${maxSlotsPerDay} занятий в день × ${workDaysCount} рабочих дней = до ${totalSlots} слотов за ${planningHorizon} дней`
  }, [currentValues])

  // Проверяем, изменились ли данные формы
  const isDirty = useMemo(() => {
    if (currentValues.lessonDuration !== initialFormValues.lessonDuration) {
      return true
    }
    if (currentValues.breakDuration !== initialFormValues.breakDuration) {
      return true
    }
    if (currentValues.planningHorizon !== initialFormValues.planningHorizon) {
      return true
    }
    if (JSON.stringify(currentValues.workingHours) !== JSON.stringify(initialFormValues.workingHours)) {
      return true
    }
    return false
  }, [currentValues, initialFormValues])

  // Уведомляем родительский компонент об изменении состояния формы
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // Обработчик сброса формы
  const handleReset = useCallback(() => {
    setCurrentValues(initialFormValues)
    setFormKey((k) => k + 1) // Принудительный перемонтаж формы для сброса значений
  }, [initialFormValues])

  // Handle form submission с оффлайн поддержкой
  const handleSubmit = async (value: ScheduleSettingsFormValues) => {
    setIsSubmitting(true)
    try {
      await offlineSubmit(value)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Обновляем текущие значения при изменении формы (для расчёта слотов)
  const handleFormChange = useCallback((values: ScheduleSettingsFormValues) => {
    setCurrentValues(values)
  }, [])

  return (
    <DrivingSchoolForm<ScheduleSettingsFormValues>
      key={formKey}
      initialValue={initialFormValues}
      onSubmit={handleSubmit}
    >
      <DrivingSchoolForm.DirtyGuard />
      <Stack gap={6}>
        <DrivingSchoolForm.Errors title="Ошибки формы" />

        {/* Индикатор оффлайн режима */}
        <HStack gap={2}>
          <FormOfflineIndicator variant="solid" />
          <FormSyncStatus showWhenEmpty={false} />
        </HStack>

        {/* Track form changes for slot calculation */}
        <FormValueTracker onChange={handleFormChange} />

        {/* Two-column layout on lg+ */}
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
          {/* Left column: Working hours */}
          <Fieldset.Root>
            <Fieldset.Legend fontWeight="bold" mb={3}>
              Рабочие часы
            </Fieldset.Legend>
            <Fieldset.Content>
              <DrivingSchoolForm.Field.Schedule
                name="workingHours"
                dayNames={DAY_NAMES}
                offLabel="Выходной"
                copyToWeekdaysLabel="Скопировать Пн на будни"
              />
            </Fieldset.Content>
          </Fieldset.Root>

          {/* Right column: Lesson parameters */}
          <Stack gap={4}>
            {/* Lesson duration */}
            <DrivingSchoolForm.Field.Select
              name="lessonDuration"
              label="Длительность занятия"
              options={LESSON_DURATION_OPTIONS}
              helperText="Стандартная длительность одного занятия"
              required
            />

            {/* Break duration */}
            <DrivingSchoolForm.Field.Select
              name="breakDuration"
              label="Перерыв между занятиями"
              options={BREAK_DURATION_OPTIONS}
              helperText="Минимальный перерыв между занятиями"
              required
            />

            {/* Planning horizon */}
            <DrivingSchoolForm.Field.Select
              name="planningHorizon"
              label="Горизонт планирования"
              options={PLANNING_HORIZON_OPTIONS}
              helperText="На сколько дней вперёд генерировать слоты для записи"
              required
            />

            {/* Slots info */}
            <Box layerStyle="panel.info">
              <Text fontWeight="medium" color="info.fg">
                Предварительный расчёт
              </Text>
              <Text fontSize="sm" color="info.fg" mt={1}>
                {slotsInfo}
              </Text>
            </Box>

            {/* Action buttons */}
            <HStack gap={3} flexWrap="wrap" justify="flex-end" mt="auto">
              {isDirty && (
                <Button type="button" variant="outline" size="lg" onClick={handleReset}>
                  <LuRotateCcw />
                  Сбросить изменения
                </Button>
              )}
              <Button type="submit" colorPalette="brand" loading={isSubmitting} size="lg" loadingText="Сохранение...">
                {isOffline ? <LuCloudOff /> : <LuSave />}
                {isOffline ? 'Сохранить локально' : 'Сохранить настройки'}
              </Button>
            </HStack>
          </Stack>
        </Grid>
      </Stack>
    </DrivingSchoolForm>
  )
}

/**
 * Вспомогательный компонент для отслеживания изменений значений формы
 * Использует Subscribe из TanStack Form для наблюдения за всеми значениями
 */
function FormValueTracker({ onChange }: { onChange: (values: ScheduleSettingsFormValues) => void }) {
  const { form } = useDeclarativeForm()

  useEffect(() => {
    const unsubscribe = form.store.subscribe(() => {
      const values = form.state.values as ScheduleSettingsFormValues
      onChange(values)
    })

    return unsubscribe
  }, [form, onChange])

  return null
}
