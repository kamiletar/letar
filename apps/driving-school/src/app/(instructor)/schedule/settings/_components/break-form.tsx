'use client'

/**
 * Форма добавления/редактирования перерыва
 */

import { Box, Button, Field, HStack, Input, Portal, SegmentGroup, Select, Stack } from '@chakra-ui/react'

import type { DayOfWeek } from '@letar/driving-school-db/prisma'

import {
  type BreakFormData,
  type BreakType,
  dayOfWeekCollection,
  dayOfWeekCollectionWithAll,
} from './custom-breaks-constants'

interface BreakFormProps {
  /** Данные формы */
  formData: BreakFormData
  /** Обновление данных формы */
  setFormData: React.Dispatch<React.SetStateAction<BreakFormData>>
  /** Режим редактирования (true) или создания (false) */
  isEditing: boolean
  /** Ожидание ответа сервера */
  isPending: boolean
  /** Минимальная дата (сегодня) */
  today: string
  /** Обработчик отмены */
  onCancel: () => void
  /** Обработчик сохранения (создание или обновление) */
  onSubmit: () => void
  /** Тип перерыва для редактирования (isRecurring) - только для режима редактирования */
  editingBreakIsRecurring?: boolean
  /** Показывать выбор типа перерыва (только для создания) */
  showTypeSelector?: boolean
}

/**
 * Форма создания/редактирования перерыва
 */
export function BreakForm({
  formData,
  setFormData,
  isEditing,
  isPending,
  today,
  onCancel,
  onSubmit,
  editingBreakIsRecurring,
  showTypeSelector = true,
}: BreakFormProps) {
  // Определяем, какой тип перерыва показывать:
  // - В режиме создания - по formData.breakType
  // - В режиме редактирования - по editingBreakIsRecurring
  const isRecurring = isEditing ? editingBreakIsRecurring : formData.breakType === 'recurring'

  return (
    <Box p={4} bg="bg.muted" borderRadius="md" borderWidth="1px" borderColor="border">
      <Stack gap={4}>
        {/* Тип перерыва - только для создания */}
        {showTypeSelector && !isEditing && (
          <Field.Root>
            <Field.Label>Тип перерыва</Field.Label>
            <SegmentGroup.Root
              value={formData.breakType}
              onValueChange={({ value }) => setFormData((prev) => ({ ...prev, breakType: value as BreakType }))}
              size="sm"
            >
              <SegmentGroup.Indicator />
              <SegmentGroup.Item value="recurring">
                <SegmentGroup.ItemText>Еженедельный</SegmentGroup.ItemText>
                <SegmentGroup.ItemHiddenInput />
              </SegmentGroup.Item>
              <SegmentGroup.Item value="oneTime">
                <SegmentGroup.ItemText>Разовый</SegmentGroup.ItemText>
                <SegmentGroup.ItemHiddenInput />
              </SegmentGroup.Item>
            </SegmentGroup.Root>
          </Field.Root>
        )}

        {/* Причина */}
        <Field.Root>
          <Field.Label>Причина</Field.Label>
          <Input
            value={formData.reason}
            onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Обед, дела, встреча и т.д."
          />
        </Field.Root>

        {/* Время */}
        <HStack gap={4}>
          <Field.Root flex={1}>
            <Field.Label>Начало</Field.Label>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
            />
          </Field.Root>

          <Field.Root flex={1}>
            <Field.Label>Окончание</Field.Label>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
            />
          </Field.Root>
        </HStack>

        {/* День недели (для еженедельного) */}
        {isRecurring && (
          <Field.Root>
            <Select.Root
              collection={isEditing ? dayOfWeekCollection : dayOfWeekCollectionWithAll}
              value={[formData.dayOfWeek]}
              onValueChange={({ value }) =>
                setFormData((prev) => ({ ...prev, dayOfWeek: value[0] as DayOfWeek | 'ALL' }))
              }
            >
              <Select.HiddenSelect />
              <Select.Label>День недели</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Выберите день" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {(isEditing ? dayOfWeekCollection : dayOfWeekCollectionWithAll).items.map((item) => (
                      <Select.Item item={item} key={item.value}>
                        {item.label}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
            {!isEditing && (
              <Field.HelperText>
                {formData.dayOfWeek === 'ALL'
                  ? 'Перерыв будет добавлен для всех ваших рабочих дней'
                  : 'Перерыв будет повторяться каждую неделю'}
              </Field.HelperText>
            )}
          </Field.Root>
        )}

        {/* Дата (для разового) */}
        {!isRecurring && (
          <Field.Root>
            <Field.Label>Дата</Field.Label>
            <Input
              type="date"
              min={today}
              value={formData.specificDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, specificDate: e.target.value }))}
            />
            {!isEditing && <Field.HelperText>Выберите конкретную дату для перерыва</Field.HelperText>}
          </Field.Root>
        )}

        {/* Кнопки */}
        <HStack gap={2} justify="flex-end">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
            Отмена
          </Button>
          <Button
            colorPalette="brand"
            size="sm"
            onClick={onSubmit}
            loading={isPending}
            loadingText={isEditing ? 'Сохранение...' : 'Добавление...'}
          >
            {isEditing ? 'Сохранить' : 'Добавить перерыв'}
          </Button>
        </HStack>
      </Stack>
    </Box>
  )
}
