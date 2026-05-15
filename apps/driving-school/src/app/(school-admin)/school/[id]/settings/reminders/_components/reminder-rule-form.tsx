'use client'

/**
 * Форма редактирования правила напоминания (Фаза 18)
 * Рефакторинг на DrivingSchoolForm API
 */

import { Box, Button, Checkbox, CheckboxGroup, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import { useFieldActions } from '@letar/forms'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import type { ReminderType } from '@letar/driving-school-db/prisma'

import type { ReminderRuleSummary } from '../_actions/reminder-rules.action'
import { upsertReminderRuleAction } from '../_actions/reminder-rules.action'
import {
  REMINDER_TYPE_METADATA,
  ReminderRuleFormSchema,
  type ReminderTypeValue,
} from '../_schemas/reminder-rules.schema'

interface ReminderRuleFormProps {
  organizationId: string
  type: ReminderType
  rule?: ReminderRuleSummary
  onSuccess?: () => void
  onCancel?: () => void
}

// Опции дней для чекбоксов
const TRIGGER_DAY_OPTIONS = [
  { value: '30', label: '30 дней' },
  { value: '14', label: '14 дней' },
  { value: '7', label: '7 дней' },
  { value: '3', label: '3 дня' },
  { value: '1', label: '1 день' },
]

/**
 * Кастомное поле для выбора дней триггера через CheckboxGroup
 */
function TriggerDaysField() {
  const { value, onChange } = useFieldActions<number[]>('triggerDays')

  const handleValueChange = (values: string[]) => {
    const numericValues = values.map(Number).sort((a, b) => b - a) // Сортируем по убыванию
    onChange(numericValues)
  }

  return (
    <Box>
      <Text fontWeight="medium" mb={3}>
        За сколько дней напоминать
      </Text>
      <CheckboxGroup value={value.map(String)} onValueChange={handleValueChange}>
        <VStack gap={2} align="start">
          {TRIGGER_DAY_OPTIONS.map((option) => (
            <Checkbox.Root key={option.value} value={option.value}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>{option.label}</Checkbox.Label>
            </Checkbox.Root>
          ))}
        </VStack>
      </CheckboxGroup>
    </Box>
  )
}

export function ReminderRuleForm({ organizationId, type, rule, onSuccess, onCancel }: ReminderRuleFormProps) {
  const metadata = REMINDER_TYPE_METADATA[type as ReminderTypeValue]

  const handleSubmit = async (value: typeof ReminderRuleFormSchema._output) => {
    const result = await upsertReminderRuleAction(value)

    if (result.success) {
      toaster.success({ title: 'Настройки сохранены' })
      onSuccess?.()
    } else {
      toaster.error({
        title: 'Ошибка сохранения',
        description: result.message || 'Попробуйте ещё раз',
      })
    }
  }

  return (
    <DrivingSchoolForm
      schema={ReminderRuleFormSchema}
      initialValue={{
        organizationId,
        type,
        enabled: rule?.enabled ?? true,
        triggerDays: rule?.triggerDays ?? metadata.defaultTriggerDays,
        pushEnabled: rule?.pushEnabled ?? true,
        emailEnabled: rule?.emailEnabled ?? true,
        telegramEnabled: rule?.telegramEnabled ?? false,
        sendToStudent: rule?.sendToStudent ?? true,
        sendToManager: rule?.sendToManager ?? false,
        escalateAfterDays: rule?.escalateAfterDays ?? undefined,
      }}
      onSubmit={handleSubmit}
    >
      <VStack gap={6} align="stretch">
        {/* Активность */}
        <Box>
          <Text fontWeight="medium" mb={3}>
            Статус
          </Text>
          <HStack justify="space-between">
            <Text fontSize="sm">Правило включено</Text>
            <DrivingSchoolForm.Field.Switch name="enabled" />
          </HStack>
        </Box>

        <Separator />

        {/* Дни триггера */}
        <TriggerDaysField />

        <Separator />

        {/* Каналы доставки */}
        <Box>
          <Text fontWeight="medium" mb={3}>
            Каналы доставки
          </Text>
          <VStack gap={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm">Push-уведомления</Text>
              <DrivingSchoolForm.Field.Switch name="pushEnabled" />
            </HStack>

            <HStack justify="space-between">
              <Text fontSize="sm">Email</Text>
              <DrivingSchoolForm.Field.Switch name="emailEnabled" />
            </HStack>

            <HStack justify="space-between">
              <Text fontSize="sm">Telegram</Text>
              <DrivingSchoolForm.Field.Switch name="telegramEnabled" />
            </HStack>
          </VStack>
        </Box>

        <Separator />

        {/* Получатели */}
        <Box>
          <Text fontWeight="medium" mb={3}>
            Кому отправлять
          </Text>
          <VStack gap={3} align="stretch">
            {metadata.supportsStudentNotification && (
              <HStack justify="space-between">
                <Text fontSize="sm">Ученику</Text>
                <DrivingSchoolForm.Field.Switch name="sendToStudent" />
              </HStack>
            )}

            {metadata.supportsManagerNotification && (
              <HStack justify="space-between">
                <Text fontSize="sm">Менеджеру школы</Text>
                <DrivingSchoolForm.Field.Switch name="sendToManager" />
              </HStack>
            )}
          </VStack>
        </Box>

        <Separator />

        {/* Эскалация */}
        <Box>
          <Text fontWeight="medium" mb={3}>
            Эскалация (опционально)
          </Text>
          <DrivingSchoolForm.Field.Number name="escalateAfterDays" min={1} max={365} />
        </Box>

        {/* Кнопки */}
        <HStack justify="end" gap={3} pt={4}>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Отмена
            </Button>
          )}
          <DrivingSchoolForm.Button.Submit colorPalette="blue">Сохранить</DrivingSchoolForm.Button.Submit>
        </HStack>
      </VStack>
    </DrivingSchoolForm>
  )
}
